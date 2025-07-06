import {AssetManagerPlugin, DiamondPlugin, GroundPlugin, ViewerApp, addBasePlugins} from "webgi";
import { JEWELRY_CONFIG } from "./config";

const state: any = {
    currentColor: null,
    currentHeadModel: null,
    currentShankModel: null,
    currentHeadName: null,
    currentShankName: null,
    mainDiamondMaterial: null,
    currentDiamondMaterial: null,
    fixedModels: {},
    diamondMaterialMap: {},
    metalMaterialMap: {},
    currentMetalMaterial: null,
    layerMaterialMap: {}
  };

async function setupViewer() {
    //getting the canvas
    const canvas = document.getElementById(JEWELRY_CONFIG.viewer.canvasId);
    if (!canvas) throw new Error(`The canvas '${JEWELRY_CONFIG.viewer.canvasId}' was not found`);
    //initializing the viewer
    const viewer = new ViewerApp({ canvas: canvas as HTMLCanvasElement });
    //disable initially
    viewer.enabled=false;
    //set the scale of configurator
    viewer.scene.modelRoot.scale.set(JEWELRY_CONFIG.viewer.rootScaleFactor,JEWELRY_CONFIG.viewer.rootScaleFactor,JEWELRY_CONFIG.viewer.rootScaleFactor);
    //adding all base plugins
    await addBasePlugins(viewer, {
        importPopup: JEWELRY_CONFIG.plugins.importPopUp,
        enableDrop: JEWELRY_CONFIG.plugins.enableDrop,
        ground: JEWELRY_CONFIG.plugins.groundPlugin.enabled,
    });
    //diamond plugin applied only if enabled
    let diamondPlugin = JEWELRY_CONFIG.plugins.diamondPlugin.enabled ? await viewer.getOrAddPlugin(DiamondPlugin) : null;
    viewer.renderer.refreshPipeline();
    //seeing if groundPlugin applied for autobaking shadows
    const ground = JEWELRY_CONFIG.plugins.groundPlugin.enabled ? viewer.getPlugin(GroundPlugin) : null;
    if(ground) ground.autoBakeShadows = JEWELRY_CONFIG.plugins.groundPlugin.autoBakeShadows

    const manager = viewer.getPlugin(AssetManagerPlugin);
    //diamonds there in your model?
    if (JEWELRY_CONFIG.materials.diamonds.enabled) 
    {
    for(const [name, option] of Object.entries(JEWELRY_CONFIG.materials.diamonds.options)){
        if (option.file) {
        state.diamondMaterialMap[name] = await loadModel(JEWELRY_CONFIG.baseURL + option.file);
        }
        state.currentDiamondMaterial = state.diamondMaterialMap[JEWELRY_CONFIG.materials.diamonds.defaultOption.toLowerCase()] || null;
    }
    // Side diamonds in your model?
    if (JEWELRY_CONFIG.materials.sideDiamonds.enabled) {
      for (const [name, option] of Object.entries(JEWELRY_CONFIG.materials.sideDiamonds.options)) {
          if (option.file) {
              state.diamondMaterialMap[name] = state.diamondMaterialMap[name] || await loadModel(JEWELRY_CONFIG.baseURL + option.file);
          }
      }
      state.currentDiamondMaterial = state.diamondMaterialMap[JEWELRY_CONFIG.materials.sideDiamonds.defaultOption.toLowerCase()] || null;
      if (JEWELRY_CONFIG.materials.sideDiamonds.createLayerMaterials) {
          JEWELRY_CONFIG.materialNameMappings.sideDiamondMaterials.forEach((layer: string) => {
              state.layerMaterialMap[layer.toLowerCase()] = state.currentDiamondMaterial?.clone();
          });
      }
  }
    // metals in your model?
    if (JEWELRY_CONFIG.materials.metals.enabled) {
        for(const [name, option] of Object.entries(JEWELRY_CONFIG.materials.metals.options)) {
            if (option.file) {
                state.metalMaterialMap[name] = await loadModel(JEWELRY_CONFIG.layerBase + option.file);
            }
        }
        state.currentMetalMaterial = state.metalMaterialMap[JEWELRY_CONFIG.materials.metals.defaultOption.toLowerCase()] || null;
    }
    
    }

    async function loadModel(url: any){
            const isMaterial = url.endsWith('.dmat') || url.endsWith('.pmat');
            const model = isMaterial ? await manager!.importer!.importSingle({ path: url }) : await viewer.load(url, { autoScale: false, autoCenter: false });
            return model;
       
    }
    //if diamonds are enabled, create the diamond materials cachekeys & normal map
    function createDiamondMaterial(model: any, diamondMaterial: any){
        if(!model || !diamondMaterial) return;
        model.modelObject.traverse((child:any) =>{
            if(child.isMesh && child.material && JEWELRY_CONFIG.materialNameMappings.sideDiamondMaterials.includes(child.material.name)){
                const cacheKey =JEWELRY_CONFIG.plugins.diamondPlugin.cacheEnabled ? JEWELRY_CONFIG.materials.diamonds.cacheKeys[child.material.name.toLowerCase()]: child.material.name;
                diamondPlugin?.prepareDiamondMesh(child, {
                    cacheKey: cacheKey,
                    normalMapRes: JEWELRY_CONFIG.plugins.diamondPlugin.normalMapRes,
                });
                const oldName = child.material.name;
          child.setMaterial(state.layerMaterialMap[child.material.name.toLowerCase()]);
          child.material.name = oldName
            }
        })
    }
    //for main diamond
    function applyMainDiamondMaterial(model: any, diamondMaterial: any) {
        model.modelObject.traverse((child:any) => {
          if (child.isMesh && JEWELRY_CONFIG.materialNameMappings.mainDiamondMaterials.includes(child.material.name)) {
            const oldName = child.material.name;
            child.material.copyProps(diamondMaterial);
            child.material.name = oldName;
          }
        });
    }
    //apply metal material to the model(can be head,shank or fixed models)
    function applyMetalMaterial(model: any) {
        const manager = viewer.getManager()
        if (!state.currentMetalMaterial) return;
        // console.log(manager)
        model.modelObject.traverse((child:any) => {
        if (child.isMesh && JEWELRY_CONFIG.materialNameMappings.metalMaterials.includes(child.material.name)) {
            manager!.materials!.applyMaterial(state.currentMetalMaterial, child.material.name);
            manager!.materials!.applyMaterial(state.currentMetalMaterial, child.material.name);
        }
    });
    viewer.setDirty();
      }
    //if head model changes,update
    async function updateHead(headName = JEWELRY_CONFIG.models.heads.defaultOption) {
    if (state.currentHeadName === headName) return;
    state.currentHeadName = headName;
    const url = JEWELRY_CONFIG.baseURL + JEWELRY_CONFIG.models.heads.options[headName].file;
    if (url) {
        const headModel = await loadModel(url);
        if (state.currentHeadModel) {
            state.currentHeadModel.modelObject.removeFromParent();
            state.currentHeadModel.modelObject.dispose();
        }
        state.currentHeadModel = headModel;
        if (JEWELRY_CONFIG.materials.metals.applyToAll) applyMetalMaterial(state.currentHeadModel);
        createDiamondMaterial(state.currentHeadModel, state.currentDiamondMaterial);
        if (JEWELRY_CONFIG.materials.diamonds.applyToMainDiamond) applyMainDiamondMaterial(state.currentHeadModel, state.mainDiamondMaterial);
        viewer.fitToView();
    }
}
//for shank change, model change
async function updateShank(shankName = JEWELRY_CONFIG.models.shanks.defaultOption) {
    if (state.currentShankName === shankName) return;
    state.currentShankName = shankName;
    const url = JEWELRY_CONFIG.baseURL + JEWELRY_CONFIG.models.shanks.options[shankName].file;
    if (url) {
        const shankModel = await loadModel(url);
        if (state.currentShankModel) {
            state.currentShankModel.modelObject.removeFromParent();
            state.currentShankModel.modelObject.dispose();
        }
        console.log(shankModel.modelObject)
        state.currentShankModel = shankModel;
        if (JEWELRY_CONFIG.materials.metals.applyToAll) applyMetalMaterial(state.currentShankModel);
        createDiamondMaterial(state.currentShankModel, state.currentDiamondMaterial);
        if (JEWELRY_CONFIG.materials.diamonds.applyToMainDiamond) applyMainDiamondMaterial(state.currentShankModel, state.mainDiamondMaterial);
        viewer.fitToView();
    }
}
    //update all metallic parts
    function updateMetalColor(colorName: any) {
        state.currentMetalMaterial = state.metalMaterialMap[colorName];
        // console.log(state.metalMaterialMap)
        if (JEWELRY_CONFIG.materials.metals.applyToAll) {
            applyMetalMaterial(state.currentShankModel);
            applyMetalMaterial(state.currentHeadModel);
            Object.values(state.fixedModels).forEach(applyMetalMaterial);
        }
    }
    if(JEWELRY_CONFIG.assets.sceneSettings){
        await viewer.load(JEWELRY_CONFIG.assets.sceneSettings)
    }
    //update material of main diamond
    function updateMainDiamondColor(diamondName: any) {
      state.mainDiamondMaterial = state.diamondMaterialMap[diamondName];
      if (JEWELRY_CONFIG.materials.diamonds.applyToMainDiamond) {
          applyMainDiamondMaterial(state.currentHeadModel, state.mainDiamondMaterial);
          Object.values(state.fixedModels).forEach((model: any) => {
              if (model.applyDiamondMaterial) applyMainDiamondMaterial(model, state.mainDiamondMaterial);
          });
      }
    }
    //for side diamonds update
    function updateSideDiamondColor(diamondName: any) {
      state.currentDiamondMaterial = state.diamondMaterialMap[diamondName];
      if (JEWELRY_CONFIG.materials.sideDiamonds.createLayerMaterials) {
          JEWELRY_CONFIG.materialNameMappings.sideDiamondMaterials.forEach((layer: string) => {
            // console.log(layer)
            if(layer==="Round"){
              state.layerMaterialMap[layer.toLowerCase()] = state.currentDiamondMaterial?.clone();
            }
          });
      }
      createDiamondMaterial(state.currentHeadModel, state.currentDiamondMaterial);
      createDiamondMaterial(state.currentShankModel, state.currentDiamondMaterial);
      Object.values(state.fixedModels).forEach((model:any) => {
          if (model.applyDiamondMaterial) createDiamondMaterial(model, state.currentDiamondMaterial);
      });
      viewer.setDirty();
  }
      //enable now
      updateHead();
      updateShank();
      //load fixed models(the extras)
      if (JEWELRY_CONFIG.fixedModels.enabled) {
        for (const [name, model] of Object.entries(JEWELRY_CONFIG.fixedModels.models)) {
          const fixedModel = await loadModel(JEWELRY_CONFIG.baseURL + model.file);
          if (!fixedModel) continue;
          state.fixedModels[name] = fixedModel;
          if (model.applyDiamondMaterial) createDiamondMaterial(state.fixedModels[name], state.currentDiamondMaterial);
          if (model.applyMetalMaterial) applyMetalMaterial(state.fixedModels[name]);
        }
      }
      viewer.fitToView();
      viewer.renderer.displayCanvasScaling = Math.min(window.devicePixelRatio, JEWELRY_CONFIG.viewer.displayCanvasScaling.maxScale);
      viewer.enabled = true;
      
    //ui stuff for configurator
    function createButtons(container: any, items: any, label: string, clickHandler: any) {
        if (JEWELRY_CONFIG.ui.showSectionTitles) {
          const title = document.createElement("div");
          title.className = JEWELRY_CONFIG.ui.sectionClass;
          title.textContent = label;
          container.appendChild(title);
        }
        items.forEach((item: any) => {
          const button = document.createElement("button");
          button.className = JEWELRY_CONFIG.ui.buttonClass;
          button.textContent = item.displayName;
          button.onclick = () => clickHandler(item.key);
          container.appendChild(button);
        });
      }
      
    
      if (JEWELRY_CONFIG.ui.enabled) {
        const ui = document.getElementById(JEWELRY_CONFIG.ui.containerId);
        if (!ui) return console.error("UI container not found");
        if (JEWELRY_CONFIG.ui.clearContainer) ui.innerHTML = "";
        if (JEWELRY_CONFIG.models.heads.enabled) {
          createButtons(ui, Object.entries(JEWELRY_CONFIG.models.heads.options).map(([key, value]) => ({ key, displayName: value.displayName })), JEWELRY_CONFIG.models.heads.displayName, updateHead);
        }
        if (JEWELRY_CONFIG.models.shanks.enabled) {
          createButtons(ui, Object.entries(JEWELRY_CONFIG.models.shanks.options).map(([key, value]) => ({ key, displayName: value.displayName })), JEWELRY_CONFIG.models.shanks.displayName, updateShank);
        }
        if (JEWELRY_CONFIG.materials.metals.enabled) {
            createButtons(ui, Object.entries(JEWELRY_CONFIG.materials.metals.options).map(([key, value]) => ({ key, displayName: value.displayName })), JEWELRY_CONFIG.materials.metals.displayName, updateMetalColor);
        }
        if (JEWELRY_CONFIG.materials.diamonds.enabled) {
          createButtons(ui, Object.entries(JEWELRY_CONFIG.materials.diamonds.options).map(([key, value]) => ({ key, displayName: value.displayName })), JEWELRY_CONFIG.materials.diamonds.displayName, updateMainDiamondColor);
        }
        if (JEWELRY_CONFIG.materials.sideDiamonds.enabled) {
          createButtons(ui, Object.entries(JEWELRY_CONFIG.materials.sideDiamonds.options).map(([key, value]) => ({ key, displayName: value.displayName })), JEWELRY_CONFIG.materials.sideDiamonds.displayName, updateSideDiamondColor);
      }
      }
 
     
//taking input from form and aoolying them property wise
   
}
document.getElementById("buildButton")?.addEventListener("click", () => {
    const baseURL = (document.getElementById("baseURL") as HTMLInputElement).value;
    const layerBase = (document.getElementById("layerBase") as HTMLInputElement).value;
    const sceneSettings = (document.getElementById("sceneSettings") as HTMLInputElement).value;
    const canvasId = (document.getElementById("canvasId") as HTMLInputElement).value;
    const rootScaleFactor = parseFloat((document.getElementById("rootScaleFactor") as HTMLInputElement).value);
    const viewerEnabled = (document.getElementById("viewerEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const autoScale = (document.getElementById("autoScale") as HTMLInputElement).value.toLowerCase() === "true";
    const autoCenter = (document.getElementById("autoCenter") as HTMLInputElement).value.toLowerCase() === "true";
    const displayCanvasScalingEnabled = (document.getElementById("displayCanvasScalingEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const maxScale = parseFloat((document.getElementById("maxScale") as HTMLInputElement).value);
    const fitToViewOnLoad = (document.getElementById("fitToViewOnLoad") as HTMLInputElement).value.toLowerCase() === "true";
    const importPopUp = (document.getElementById("importPopUp") as HTMLInputElement).value.toLowerCase() === "true";
    const enableDrop = (document.getElementById("enableDrop") as HTMLInputElement).value.toLowerCase() === "true";
    const debugPluginEnabled = (document.getElementById("debugPluginEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const diamondPluginEnabled = (document.getElementById("diamondPluginEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const normalMapRes = parseInt((document.getElementById("normalMapRes") as HTMLInputElement).value);
    const cacheEnabled = (document.getElementById("cacheEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const groundPluginEnabled = (document.getElementById("groundPluginEnabled") as HTMLInputElement).value.toLowerCase() === "true";
    const autoBakeShadows = (document.getElementById("autoBakeShadows") as HTMLInputElement).value.toLowerCase() === "true";
    const headOptions = JSON.parse((document.getElementById("headOptions") as HTMLTextAreaElement).value);
    const defaultHead = (document.getElementById("defaultHead") as HTMLInputElement).value.toLowerCase();
    const shankOptions = JSON.parse((document.getElementById("shankOptions") as HTMLTextAreaElement).value);
    const defaultShank = (document.getElementById("defaultShank") as HTMLInputElement).value.toLowerCase();
    const metalOptions = JSON.parse((document.getElementById("metalOptions") as HTMLTextAreaElement).value);
    const defaultMetal = (document.getElementById("defaultMetal") as HTMLInputElement).value.toLowerCase();
    const diamondOptions = JSON.parse((document.getElementById("diamondOptions") as HTMLTextAreaElement).value);
    const defaultDiamond = (document.getElementById("defaultDiamond") as HTMLInputElement).value.toLowerCase();
    const sideDiamondOptions = JSON.parse((document.getElementById("sideDiamondOptions") as HTMLTextAreaElement).value);
    const defaultSideDiamond = (document.getElementById("defaultSideDiamond") as HTMLInputElement).value.toLowerCase();
    const cacheKeys = JSON.parse((document.getElementById("cacheKeys") as HTMLTextAreaElement).value);
    const uiContainerId = (document.getElementById("uiContainerId") as HTMLInputElement).value;
    const uiClearContainer = (document.getElementById("uiClearContainer") as HTMLInputElement).value.toLowerCase() === "true";
    const buttonClass = (document.getElementById("buttonClass") as HTMLInputElement).value;
    const sectionClass = (document.getElementById("sectionClass") as HTMLInputElement).value;
    const showSectionTitles = (document.getElementById("showSectionTitles") as HTMLInputElement).value.toLowerCase() === "true";
    const disposeOldModels = (document.getElementById("disposeOldModels") as HTMLInputElement).value.toLowerCase() === "true";
    const memoryCleanup = (document.getElementById("memoryCleanup") as HTMLInputElement).value.toLowerCase() === "true";
    const refreshPipelineOnPluginAdd = (document.getElementById("refreshPipelineOnPluginAdd") as HTMLInputElement).value.toLowerCase() === "true";
    const setDirtyOnMaterialChange = (document.getElementById("setDirtyOnMaterialChange") as HTMLInputElement).value.toLowerCase() === "true";

    JEWELRY_CONFIG.baseURL = baseURL;
    JEWELRY_CONFIG.layerBase = layerBase;
    JEWELRY_CONFIG.assets.sceneSettings = sceneSettings;
    JEWELRY_CONFIG.viewer.canvasId = canvasId;
    JEWELRY_CONFIG.viewer.rootScaleFactor = rootScaleFactor;
    JEWELRY_CONFIG.viewer.enabled = viewerEnabled;
    JEWELRY_CONFIG.viewer.autoScale = autoScale;
    JEWELRY_CONFIG.viewer.autoCenter = autoCenter;
    JEWELRY_CONFIG.viewer.displayCanvasScaling.enabled = displayCanvasScalingEnabled;
    JEWELRY_CONFIG.viewer.displayCanvasScaling.maxScale = maxScale;
    JEWELRY_CONFIG.viewer.fitToViewOnLoad = fitToViewOnLoad;
    JEWELRY_CONFIG.plugins.importPopUp = importPopUp;
    JEWELRY_CONFIG.plugins.enableDrop = enableDrop;
    JEWELRY_CONFIG.plugins.debugPlugin.enabled = debugPluginEnabled;
    JEWELRY_CONFIG.plugins.diamondPlugin.enabled = diamondPluginEnabled;
    JEWELRY_CONFIG.plugins.diamondPlugin.normalMapRes = normalMapRes;
    JEWELRY_CONFIG.plugins.diamondPlugin.cacheEnabled = cacheEnabled;
    JEWELRY_CONFIG.plugins.groundPlugin.enabled = groundPluginEnabled;
    JEWELRY_CONFIG.plugins.groundPlugin.autoBakeShadows = autoBakeShadows;
    JEWELRY_CONFIG.models.heads.options = headOptions;
    JEWELRY_CONFIG.models.heads.defaultOption = defaultHead;
    JEWELRY_CONFIG.models.shanks.options = shankOptions;
    JEWELRY_CONFIG.models.shanks.defaultOption = defaultShank;
    JEWELRY_CONFIG.materials.metals.options = metalOptions;
    JEWELRY_CONFIG.materials.metals.defaultOption = defaultMetal;
    JEWELRY_CONFIG.materials.diamonds.options = diamondOptions;
    JEWELRY_CONFIG.materials.diamonds.defaultOption = defaultDiamond;
    JEWELRY_CONFIG.materials.sideDiamonds.options = sideDiamondOptions;
    JEWELRY_CONFIG.materials.sideDiamonds.defaultOption = defaultSideDiamond;
    JEWELRY_CONFIG.materials.diamonds.cacheKeys = cacheKeys;
    JEWELRY_CONFIG.ui.containerId = uiContainerId;
    JEWELRY_CONFIG.ui.clearContainer = uiClearContainer;
    JEWELRY_CONFIG.ui.buttonClass = buttonClass;
    JEWELRY_CONFIG.ui.sectionClass = sectionClass;
    JEWELRY_CONFIG.ui.showSectionTitles = showSectionTitles;
    JEWELRY_CONFIG.performance.disposeOldModels = disposeOldModels;
    JEWELRY_CONFIG.performance.memoryCleanup = memoryCleanup;
    JEWELRY_CONFIG.performance.refreshPipelineOnPluginAdd = refreshPipelineOnPluginAdd;
    JEWELRY_CONFIG.performance.setDirtyOnMaterialChange = setDirtyOnMaterialChange;

    (document.getElementById("configurator-form") as HTMLElement).style.display = "none";
    (document.getElementById("mcanvas") as HTMLElement).style.display = "block";
    (document.getElementById("mconfigurator") as HTMLElement).style.display = "block";

    setupViewer();
});


