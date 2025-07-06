export interface ViewerConfig {
    rootScaleFactor: number;
    canvasId: string;
    enabled: boolean;
    autoScale: boolean;
    autoCenter: boolean;
    displayCanvasScaling: {
      enabled: boolean;
      maxScale: number;
    };
    fitToViewOnLoad: boolean;
  }
  
  export interface PluginConfig {
    importPopUp: boolean;
    enableDrop: boolean;
    debugPlugin: {
      enabled: boolean;
    };
    diamondPlugin: {
      enabled: boolean;
      normalMapRes: number;
      cacheEnabled: boolean;
    };
    groundPlugin: {
      enabled: boolean;
      autoBakeShadows: boolean;
    };
  }
  
  export interface AssetConfig {
    baseUrl: string;
    sceneSettings: string;
    loadSceneSettings: boolean;
  }
  
  export interface ModelOption {
    displayName: string;
    file: string;
  }
  
  export interface ModelGroup {
    enabled: boolean;
    displayName: string;
    options: Record<string, ModelOption>;
    defaultOption: string;
    loadDefault: boolean;
  }
  
  export interface ModelsConfig {
    heads: ModelGroup;
    shanks: ModelGroup;
  }
  
  export interface MaterialOption {
    displayName: string;
    file: string;
  }
  
  export interface MetalMaterialConfig {
    enabled: boolean;
    displayName: string;
    options: Record<string, MaterialOption>;
    defaultOption: string;
    applyToAll: boolean;
  }
  
  export interface DiamondMaterialConfig {
    enabled: boolean;
    displayName: string;
    cacheKeys: Record<string, string>;
    options: Record<string, MaterialOption>;
    defaultOption: string;
    createLayerMaterials: boolean;
    applyToMainDiamond: boolean;
  }
  export interface sideDiamondMaterialConfig {
    enabled: boolean;
    displayName: string;
    cacheKeys?: Record<string, string>;
    options: Record<string, MaterialOption>;
    defaultOption: string;
    createLayerMaterials: boolean;
  }
  
  export interface MaterialsConfig {
    metals: MetalMaterialConfig;
    diamonds: DiamondMaterialConfig;
    sideDiamonds: sideDiamondMaterialConfig;
  }
  
  export interface FixedModel {
    file: string;
    applyDiamondMaterial: boolean;
    applyMetalMaterial: boolean;
  }
  
  export interface FixedModelsConfig {
    enabled: boolean;
    models: Record<string, FixedModel>;
  }
  
  export interface MaterialNameMappings {
    sideDiamondMaterials: string[];
    mainDiamondMaterials: string[];
    metalMaterials: string[];
  }
  
  export interface UIConfig {
    enabled: boolean;
    containerId: string;
    clearContainer: boolean;
    buttonClass: string;
    sectionClass: string;
    showSectionTitles: boolean;
  }
  
  export interface PerformanceConfig {
    disposeOldModels: boolean;
    memoryCleanup: boolean;
    refreshPipelineOnPluginAdd: boolean;
    setDirtyOnMaterialChange: boolean;
  }
  
  export interface JewelryConfig {
    baseURL: string;
    layerBase: string;
    viewer: ViewerConfig;
    plugins: PluginConfig;
    assets: AssetConfig;
    models: ModelsConfig;
    materials: MaterialsConfig;
    fixedModels: FixedModelsConfig;
    materialNameMappings: MaterialNameMappings;
    ui: UIConfig;
    performance: PerformanceConfig;
  }
  