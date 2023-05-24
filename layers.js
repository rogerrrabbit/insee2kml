const LAYERS = [
    /*{
        "title": "Surfaces hydrographiques",
        "mainUrl": "https://wxs.ign.fr/cartovecto/geoportail/wfs",
        "typename": "BDCARTO_BDD_WLD_WGS84G:surface_hydrographique"
    },*/

    /*{
        "title": "Pistes d'aérodromes",
        "mainUrl": "https://wxs.ign.fr/cartovecto/geoportail/wfs",
        "typename": "BDCARTO_V5:piste_d_aerodrome"
    },*/

    // Sites pollués ou potentiellement pollués appelant une action des pouvoirs publics,
    // à titre préventif ou curatif (BASOL)
    {
        "title": "Sites pollués",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:SSP_INSTR_GE_POLYGONE"
    },

    /*{
        "title": "Aléa débordement cours d'eau fréquent",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:ALEA_SYNT_01_01FOR_FXX"
    },*/

    /*{
        "title": "Aléa ruissellement fréquent",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:ALEA_SYNT_02_01FOR_FXX"
    },*/

    {
        "title": "Aléa submersion fréquent",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:ALEA_SYNT_03_01FOR_FXX"
    },

    /*{
        "title": "Retrait-gonflement des argiles",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:ALEARG_REALISE"
    },*/

    {
        "title": "Zones de sur-aléa inondation",
        "mainUrl": "https://georisques.gouv.fr/services",
        "typename": "ms:OUV_ZONSALEA_FXX"
    },
];