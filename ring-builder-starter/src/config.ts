import type { JewelryConfig } from './types/JewelryConfig';
export const JEWELRY_CONFIG: JewelryConfig  = { 
    "baseURL": "https://pixotronicscontent.s3.ap-south-1.amazonaws.com/engagementring/",
    "layerBase":"https://pixotronicscontent.s3.ap-south-1.amazonaws.com/layerconfig/",
    "viewer" : 
    {
        "rootScaleFactor" : 1,
        "canvasId": "mcanvas",
        "enabled": false,
        "autoScale" : false,
        "autoCenter": false,
        "displayCanvasScaling":
        {
            "enabled": true,
            "maxScale" : 1.5
        },
        "fitToViewOnLoad": true
    },

    "plugins":{
        "importPopUp" : false,
        "enableDrop":false,
        "debugPlugin": {
            "enabled": false
        },
        "diamondPlugin":{
            "enabled": true,
            "normalMapRes": 512,
            "cacheEnabled": true
        },
        "groundPlugin":{
            "enabled": true,
            "autoBakeShadows" : true
        }
    },

    "assets":{
        "baseUrl":"https://pixotronicscontent.s3.ap-south-1.amazonaws.com/engagementring/",
        "sceneSettings": "https://pixotronicscontent.s3.ap-south-1.amazonaws.com/engagementring/scenesettings.vjson",
        "loadSceneSettings": true
    },


    "models": {
        "heads": {
          "enabled": true,
          "displayName": "Heads",
          "options": {
            "cushion": {
              "displayName": "Cushion",
              "file": "cushion_halo.glb"
            },
            "pear": {
              "displayName": "Pear", 
              "file": "pear_halo.glb"
            },
            "round": {
              "displayName": "Round",
              "file": "solitair.glb"
            }
          },
          "defaultOption": "cushion",
          "loadDefault": true
        },
        
        "shanks": {
          "enabled": true,
          "displayName": "Shanks",
          "options": {
            "alliance": {
              "displayName": "Alliance",
              "file": "alliance.glb"
            },
            "baguette": {
              "displayName": "Baguette", 
              "file": "baguette.glb"
            },
            "solitaire": {
              "displayName": "Solitaire",
              "file": "soli.glb"
            },
            "pave": {
              "displayName": "Pave",
              "file": "pave.glb"
            },
            "pave side": {
              "displayName": "Pave Side",
              "file": "pave_side.glb"
            }
          },
          "defaultOption": "solitaire",
          "loadDefault": true
        }
    },
    "materials":{
        "metals":{
            "enabled": true,
            "displayName": "Metal Colors",
            "options": {
                "yellow-gold": {
                "displayName": "Yellow-Gold",
                "file": "gold-yellow.pmat"
                },
                "white-gold": {
                "displayName": "White-Gold",
                "file": "gold-white.pmat"
                },
                "rose-gold": {
                "displayName": "Rose-Gold", 
                "file": "gold-rose.pmat"
                },
            },
            "defaultOption": "yellow-gold",
            "applyToAll": true
        },

        "diamonds":{
            "enabled": true,
            "displayName": "Diamond Types",
            "cacheKeys": {
              "round": "Round",
              "round_main": "Round_Main",
              "pear": "Pear",
              "cushion": "Cushion"
            },
            "options": {
                "diamond": {
                "displayName": "Diamond",
                "file": "diamond.dmat"
                },
                "ruby": {
                "displayName": "Ruby",
                "file": "ruby.dmat"
                },
                "diamondblack": {
                "displayName": "DiamondBlack", 
                "file": "diamondblack.dmat"
                },
                "sapphire": {
                "displayName": "Sapphire",
                "file": "sapphire.dmat"
                }
            },
            "defaultOption": "diamond",
            "createLayerMaterials": true,
            "applyToMainDiamond": true
        },
        "sideDiamonds": {
               "enabled": true,
               "displayName": "Side Diamond Types",
               "options": {
                   "diamond": {
                       "displayName": "Diamond",
                       "file": "diamond.dmat"
                   },
                   "ruby": {
                       "displayName": "Ruby",
                       "file": "ruby.dmat"
                   },
                   "diamondblack": {
                       "displayName": "DiamondBlack",
                       "file": "diamondblack.dmat"
                   },
                   "sapphire": {
                       "displayName": "Sapphire",
                       "file": "sapphire.dmat"
                   }
               },
               "defaultOption": "diamond",
               "createLayerMaterials": true
           }
    },
        "fixedModels": {
            "enabled": true,
            "models": {
              "details": {
                "file": "details.glb",
                "applyDiamondMaterial": true,
                "applyMetalMaterial": true
              }
            }
        },

        "materialNameMappings": {
            "sideDiamondMaterials": ["Round", "Round_Main", "Cushion", "Pear"],
            "mainDiamondMaterials": ["Round_Main", "Cushion", "Pear"],
            "metalMaterials": ["Metal"]
        },

        "ui": {
          "enabled": true,
          "containerId": "mconfigurator",
          "clearContainer": true,
          "buttonClass": "config-button",
          "sectionClass": "variations",
          "showSectionTitles": true
        },
        
        "performance": {
        "disposeOldModels": true,
        "memoryCleanup": true,
        "refreshPipelineOnPluginAdd": true,
        "setDirtyOnMaterialChange": true
        },
        

}