import {AssetManagerPlugin, DiamondPlugin, GroundPlugin, ViewerApp, addBasePlugins} from "webgi";
import { JEWELRY_CONFIG } from "./config";


document.addEventListener("DOMContentLoaded", () => {
  const formInputs = document.querySelectorAll('#home input, #home textarea');
  formInputs.forEach((input) => {
    const typedInput = input as HTMLInputElement | HTMLTextAreaElement;
    console.log(input.id, typedInput.value);
    const savedValue = sessionStorage.getItem(typedInput.id);
        if (savedValue) {
            typedInput.value = savedValue;
        }
    });
}
);

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
    const canvas = document.getElementById("mcanvas") as HTMLCanvasElement;
    canvas.width = 800; 
canvas.height = 600;
canvas.classList.add("active");
if (!canvas) throw new Error(`The canvas mcanvas was not found`)
    console.log(canvas?.clientWidth, canvas?.clientHeight);

    
    
    //initializing the viewer
    const viewer = new ViewerApp({ canvas: canvas as HTMLCanvasElement});
    //disable initially
    viewer.enabled=false;
    //set the scale of configurator
    viewer.scene.modelRoot.scale.set(JEWELRY_CONFIG.viewer.rootScaleFactor,JEWELRY_CONFIG.viewer.rootScaleFactor,JEWELRY_CONFIG.viewer.rootScaleFactor);
    //adding all base plugins
    await addBasePlugins(viewer, {
        importPopup: false,
        enableDrop: false,
        ground: JEWELRY_CONFIG.plugins.groundPlugin.enabled,
    });
    //diamond plugin applied only if enabled
    let diamondPlugin = await viewer.getOrAddPlugin(DiamondPlugin);
    viewer.renderer.refreshPipeline();
    //seeing if groundPlugin applied for autobaking shadows
    const ground = JEWELRY_CONFIG.plugins.groundPlugin.enabled ? viewer.getPlugin(GroundPlugin) : null;
    if(ground) ground.autoBakeShadows = false;

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
    const trimmedUrl = JEWELRY_CONFIG.baseURL.replace(/\/[^\/]+\/?$/, "/");
    // console.log(typeof(trimmedUrl))
    if (JEWELRY_CONFIG.materials.metals.enabled) {
        for(const [name, option] of Object.entries(JEWELRY_CONFIG.materials.metals.options)) {
            if (option.file) {
              
              // console.log("Loading metal:", name, "from URL:", trimmedUrl + option.file);

                state.metalMaterialMap[name] = await loadModel(trimmedUrl + option.file);
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
                const cacheKey = JEWELRY_CONFIG.materials.diamonds.cacheKeys[child.material.name.toLowerCase()];
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
        }
    });
    viewer.setDirty();
      }
    function adjust(){
      const metalHeadInsert = viewer.scene.findObjectsByName("metal-head-insert")[0];
        const metalHead = viewer.scene.findObjectsByName("metal-head")[0];
      
        const bounds = viewer.scene.getBounds(false, true); 
      
        const height =
          bounds.setFromObject(metalHead).getSize(bounds.min.clone()).y /
          JEWELRY_CONFIG.viewer.rootScaleFactor;
        bounds
          .setFromObject(metalHeadInsert)
          .getCenter(metalHead!.parent!.position)
          .multiplyScalar(1 /  JEWELRY_CONFIG.viewer.rootScaleFactor);
        metalHead!.parent!.position.y += height / 2;
    }
    //if head model changes,update
    async function updateHead(headName = JEWELRY_CONFIG.models.heads.defaultOption) {
    if (state.currentHeadName === headName) return;
    state.currentHeadName = headName;
    const url = JEWELRY_CONFIG.baseURL + JEWELRY_CONFIG.models.heads.options[headName].file;
    if (url) {
        const headModel = await loadModel(url);
        // console.log("head",headModel)
        if (state.currentHeadModel) {
            state.currentHeadModel.modelObject.removeFromParent();
            state.currentHeadModel.modelObject.dispose();
        }
        state.currentHeadModel = headModel;
        if (JEWELRY_CONFIG.materials.metals.applyToAll) applyMetalMaterial(state.currentHeadModel);
        createDiamondMaterial(state.currentHeadModel, state.currentDiamondMaterial);
        if (JEWELRY_CONFIG.materials.diamonds.applyToMainDiamond) applyMainDiamondMaterial(state.currentHeadModel, state.mainDiamondMaterial);
        adjust();
        // viewer.fitToView();
    }
}
//for shank change, model change
async function updateShank(shankName = JEWELRY_CONFIG.models.shanks.defaultOption) {
    if (state.currentShankName === shankName) return;
    state.currentShankName = shankName;
    const url = JEWELRY_CONFIG.baseURL + JEWELRY_CONFIG.models.shanks.options[shankName].file;
    if (url) {
        const shankModel = await loadModel(url);
        // console.log("shank",shankModel)
        if (state.currentShankModel) {
            state.currentShankModel.modelObject.removeFromParent();
            state.currentShankModel.modelObject.dispose();
        }
        // console.log(shankModel.modelObject)
        state.currentShankModel = shankModel;
        if (JEWELRY_CONFIG.materials.metals.applyToAll) applyMetalMaterial(state.currentShankModel);
        createDiamondMaterial(state.currentShankModel, state.currentDiamondMaterial);
        if (JEWELRY_CONFIG.materials.diamonds.applyToMainDiamond) applyMainDiamondMaterial(state.currentShankModel, state.mainDiamondMaterial);
        adjust()
        // viewer.fitToView();
    }
}
    function resetViewer(){
      if (viewer) {
        while (viewer.scene.modelRoot.children.length > 0) {
            viewer.scene.modelRoot.children[0].removeFromParent();
        }
        viewer.scene.dispose();
        viewer.renderer.refreshPipeline();
    }
    state.currentColor = null;
    state.currentHeadModel = null;
    state.currentShankModel = null;
    state.currentHeadName = null;
    state.currentShankName = null;
    state.mainDiamondMaterial = null;
    state.currentDiamondMaterial = null;
    state.fixedModels = {};
    state.diamondMaterialMap = {};
    state.metalMaterialMap = {};
    state.currentMetalMaterial = null;
    state.layerMaterialMap = {};
  }
    //go back to form
    function goBack() {
      {
        (document.getElementById("home") as HTMLElement).style.display = "block";
        (document.getElementById("mcanvas") as HTMLElement).style.display = "none";
        (document.getElementById("mconfigurator") as HTMLElement).style.display = "none";
        resetViewer();
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
      ground?.bakeShadows();
      viewer.renderer.displayCanvasScaling = Math.min(window.devicePixelRatio, 1.5);
      viewer.enabled = true;
      const controls = viewer.scene.activeCamera.controls as any;
      controls.minDistance = 2;
      controls.maxDistance = 12;
      
    //ui stuff for configurator
    function createButtons(container: any, items: any, label: string, clickHandler: any) {
        
          const title = document.createElement("div");
          title.className = "variations";
          title.textContent = label;
          container.appendChild(title);
        
        items.forEach((item: any) => {
          const button = document.createElement("button");
          button.className = "config-button";
          button.textContent = item.displayName;
          button.onclick = () => clickHandler(item.key);
          container.appendChild(button);
        });
      }
      viewer.scene.backgroundColor = "#000000";
      console.log(viewer.scene)

    
       
        const ui = document.getElementById("mconfigurator");
        createButtons(ui, [{ key: "goBack", displayName: "Go Back" }], "Go Back", goBack )
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
function saveForm(){
  const formInputs = document.querySelectorAll('#home input, #home textarea');
  formInputs.forEach((input) => {
    const typedInput = input as HTMLInputElement | HTMLTextAreaElement;
    sessionStorage.setItem(typedInput.id, typedInput.value);
  })
}

//home page form logic
const steps = document.querySelectorAll('.form-step');
const indicators:any = document.querySelectorAll('.form-step-indicator');
const nextBtn:any = document.querySelector('.form-next');
const backBtn:any = document.querySelector('.form-back');
let currentStep = 0;

function showStep(index: number) {
  steps.forEach((step, i) => {
    step.classList.toggle('hidden', i !== index);
    indicators[i].classList.toggle('text-gray-900', i === index);
    indicators[i].querySelector('span').classList.toggle('bg-indigo-400', i === index);
    indicators[i].querySelector('span').classList.toggle('text-white', i === index);
  });
  backBtn.classList.toggle('hidden', index === 0);
  nextBtn.textContent = index === 3 ? 'Build Configurator' : 'Next Step';
}


nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
  else if(currentStep === steps.length-1  && nextBtn.textContent === 'Build Configurator') {
    // console.log("builded")
  const baseURL = (document.getElementById("baseURL") as HTMLInputElement).value;
  const sceneSettings = (document.getElementById("sceneSettings") as HTMLInputElement).value;
  const rootScaleFactor = parseFloat((document.getElementById("rootScaleFactor") as HTMLInputElement).value);
  const normalMapRes = parseInt((document.getElementById("normalMapRes") as HTMLInputElement).value);
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

  JEWELRY_CONFIG.baseURL = baseURL;
  JEWELRY_CONFIG.assets.sceneSettings = sceneSettings;
  JEWELRY_CONFIG.viewer.rootScaleFactor = rootScaleFactor;
  JEWELRY_CONFIG.plugins.diamondPlugin.normalMapRes = normalMapRes;
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

  saveForm(); //save form data in the session storage and autofill
 
  (document.getElementById("home") as HTMLElement).style.display = "none";
  (document.getElementById("mcanvas") as HTMLElement).style.display = "block";
  (document.getElementById("mconfigurator") as HTMLElement).style.display = "block";

  
  setupViewer();

 
  }
});

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
});

showStep(currentStep);

//taking input from form and aoolying them property wise
// document.getElementById("buildButton")?.addEventListener("click", () => {

    
// });


