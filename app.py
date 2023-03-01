import re
import os
import random
import string
import configparser
import urllib.request
from PyQt5.QtCore import QVariant
from qgis.core import *
from qgis.utils import *
import tornado.ioloop
import tornado.web
import py7zr
import progressbar
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

COMMUNES = NULL
OUTPUT_FORMAT = NULL
CRS_IN  = NULL
CRS_OUT = NULL

def get_random_string(length):
    # Chaîne de caractères alpha aléatoires
    return ''.join(random.choice(string.ascii_letters) for i in range(length))

def escape_expression_qgis(s):
    # Remplace les espaces et les caractères non alphanumériques par des %
    return re.sub(r'[^a-zA-Z]+', '_', s.replace(' ', '_'))

# Extraire les features sélectionnées au sein d'une layer vers une nouvelle layer
def select_features(layer):
    copy = QgsVectorLayer("MultiPolygon?crs=" + CRS_IN, "copy", "memory")
    copy.startEditing()
    copy_dp = copy.dataProvider()
    fields = QgsFields()

    # Enregistrement d'un nouvel attribut "name" afin de générer la
    # balise "<name>" des placemarks (KML)
    fields.append(QgsField("name", QVariant.String))

    copy_dp.addAttributes(fields)

    for feature in layer.selectedFeatures():
        copy_fet = QgsFeature(fields)
        copy_fet.setAttribute('name', feature["NOM_IRIS"])

        copy_fet.setGeometry(feature.geometry())
        copy_dp.addFeatures([copy_fet])

    copy.commitChanges()
    return copy

# Ecrire un fichier de zone sur disque à partir de codes communes INSEE
# Le nom du fichier est choisi aléatoirement
def write_zone(codes_commune, format):
    # Générer le fichier de zone en utilisant la saisie de l'utilisateur
    # Retourne le chemin d'accès au fichier de zone généré
    filename = get_random_string(5) + "." + format.lower()

    # Sélectionner les lieux correspondant aux codes de commune
    print(f"Sélection des communes ({len(codes_commune)})...", file=sys.stderr)
    expression = "\"INSEE_COM\" IN ({0})" \
        .format(','.join(["'{0}'".format(code) for code in codes_commune]))
    COMMUNES.selectByExpression(expression, QgsVectorLayer.SetSelection)

    # Créer une couche temporaire pour altérer les features sélectionnées
    print(f"Création des secteurs ({COMMUNES.selectedFeatureCount()})...", file=sys.stderr)
    selection = select_features(COMMUNES)

    # Exporter la sélection
    print(f"Ecriture dans {filename}...", file=sys.stderr)
    crs_out = QgsCoordinateReferenceSystem(CRS_OUT)
    error = QgsVectorFileWriter.writeAsVectorFormat(selection, filename,
                                                    "UTF-8", crs_out,
                                                    format, False)
    if error[0] != QgsVectorFileWriter.NoError:
        return NULL

    return filename

# Récupérer les codes INSEE d'une ville donnée
def get_insee_codes(name):
    # Récupérer les codes INSEE de la ville à partir de son nom
    # Retourne une liste de codes INSEE
    print(f"Recherche de {name}...", file=sys.stderr)

    # Try with exact match (but not case sensitive)
    expression = "\"NOM_COM\" ILIKE '{}'".format(escape_expression_qgis(name))
    features = list(COMMUNES.getFeatures(QgsFeatureRequest().setFilterExpression(expression)))
    if not features:
        # Try harder (characters before and after)
        expression = "\"NOM_COM\" ILIKE '%{}%'".format(escape_expression_qgis(name))
        features = list(COMMUNES.getFeatures(QgsFeatureRequest().setFilterExpression(expression)))

    # Liste des codes communes obtenus (sans doublon)
    codes_commune = list(set(f["INSEE_COM"] for f in features))

    if len(codes_commune) == 0:
        print(f"Aucune commune trouvée pour le nom '{name}'", file=sys.stderr)

    return codes_commune

# Générer un fichier de zone et le retourner
class GenerateHandler(tornado.web.RequestHandler):
    def get(self):
        # Récupère la saisie de l'utilisateur
        insee_codes = self.get_argument('insee_codes', '')
        ville_name = self.get_argument('ville_name', '')

        # En-têtes de réponse
        self.set_header('Content-Type', 'application/octet-stream')
        self.set_header('Content-Disposition', 'attachment; filename="generated"')

        # Vérifie si l'utilisateur a saisi des codes INSEE ou le nom d'une ville
        if insee_codes:
            codes = insee_codes.replace(",", " ").split()
            # Appelle la fonction pour générer le fichier de zone à partir des codes INSEE
            zone_file = write_zone(codes, OUTPUT_FORMAT)
        elif ville_name:
            # Appelle la fonction pour récupérer les codes INSEE de la ville
            codes = get_insee_codes(ville_name)
            # Appelle la fonction pour générer le fichier de zone à partir des codes INSEE
            zone_file = write_zone(codes, OUTPUT_FORMAT)
        else:
            self.finish()
            return

        # Télécharge le fichier de zone
        if zone_file and os.path.isfile(zone_file):
            with open(zone_file, 'rb') as f:
                while True:
                    data = f.read(4096)
                    if not data:
                        break
                    self.write(data)
            os.remove(zone_file)

        self.finish()

# Page d'accueil du site
class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("template.html", title="INSEE2KML")

class DownloadBar():
    def __init__(self):
        self.pbar = None

    def __call__(self, block_num, block_size, total_size):
        if not self.pbar:
            self.pbar=progressbar.ProgressBar(maxval=total_size)
            self.pbar.start()

        downloaded = block_num * block_size
        if downloaded < total_size:
            self.pbar.update(downloaded)
        else:
            self.pbar.finish()

# Configuration de l'application Tornado
def make_app():
    return tornado.web.Application([
        (r'/', MainHandler),
        (r'/generate', GenerateHandler),
        (r'/(favicon.ico)', tornado.web.StaticFileHandler, {"path": ""}),
        (r'/(style.css)', tornado.web.StaticFileHandler, {"path": ""}),
        (r'/(main.js)', tornado.web.StaticFileHandler, {"path": ""}),
    ])

# Recherche du fichier de données
def find_file(cache, folder, file):
    for root, dirs, files in os.walk(cache):
        if file in files and re.search(folder, root):
            return os.path.join(root, file)
    return NULL

def download_file(url, output_folder):
    dl_path = os.path.join(output_folder, "downloaded")
    dl_file, headers = urllib.request.urlretrieve(url, dl_path, DownloadBar())
    if not dl_file:
        print(f"Téléchargement échoué.", file=sys.stderr)
    return dl_file

# Chargement des données
def load_data(url, cache, folder, file):
    print("Recherche des données...", file=sys.stderr)
    data_file = find_file(cache, folder, file)
    if not data_file:
        print(f"Chemin non trouvé : {folder}/{file}", file=sys.stderr)
        print(f"Téléchargement des données...", file=sys.stderr)
        archive_file = download_file(url, cache)
        if not archive_file:
            return NULL
        archive = py7zr.SevenZipFile(archive_file, mode='r')
        archive.extractall(path=cache)
        archive.close()
        data_file = find_file(cache, folder, file)
        if not data_file:
            print(f"Chemin non trouvé : {folder}/{file}", file=sys.stderr)
            return NULL

    print("Chargement du fichier de carte...", file=sys.stderr)
    layer = QgsVectorLayer(data_file, "communes", "ogr")
    return layer if layer.hasFeatures() else NULL

if __name__ == '__main__':
    config = configparser.ConfigParser()
    config.read('config.ini')

    OUTPUT_FORMAT = config.get('global', 'output_format')
    CRS_OUT = config.get('global', 'output_crs')
    CRS_IN = config.get('map_data', 'crs')
    
    cache_path = config.get('global', 'cache_path')
    folder_name = config.get('map_data', 'folder')
    file_name = config.get('map_data', 'file')
    url = config.get('map_data', 'url')
    
    # Initialiser une app QGIS
    APP = QgsApplication([], False)
    QgsApplication.initQgis()

    # Charger la couche de communes/IRIS françaises
    COMMUNES = load_data(url, cache_path, folder_name, file_name)
    if not COMMUNES:
        print(f"Erreur au chargement des données de carte.", file=sys.stderr)
        sys.exit(1)

    # Lancement de l'app Tornado
    app = make_app()
    app.listen(8888)
    print("Prêt.", file=sys.stderr)
    tornado.ioloop.IOLoop.current().start()