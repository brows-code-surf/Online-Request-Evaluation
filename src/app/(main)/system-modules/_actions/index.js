'use server';

import MODULE from '@/models/Module.js';

export async function getAllModules() {
  try {
    const modules = await MODULE.getAllModules();
    return {
      success: true,
      data: modules
    };
  } catch (error) {
    console.error('Error fetching modules:', error);
    return {
      success: false,
      message: 'Failed to fetch modules: ' + error.message
    };
  }
}

export async function getActiveModules() {
  try {
    const modules = await MODULE.getActiveModules();
    return {
      success: true,
      data: modules
    };
  } catch (error) {
    console.error('Error fetching active modules:', error);
    return {
      success: false,
      message: 'Failed to fetch active modules: ' + error.message
    };
  }
}

export async function getModuleById(moduleId) {
  try {
    const module = await MODULE.getModuleById(moduleId);
    return {
      success: true,
      data: module
    };
  } catch (error) {
    console.error('Error fetching module:', error);
    return {
      success: false,
      message: 'Failed to fetch module: ' + error.message
    };
  }
}

export async function addModule(moduleData, createdBy) {
  try {
    // Validate required fields
    if (!moduleData.name) {
      return {
        success: false,
        message: 'Module name is required'
      };
    }

    // For parent modules, validate module identifier
    if (!moduleData.submodule && !moduleData.submodulename) {
      if (!moduleData.module) {
        return {
          success: false,
          message: 'Module identifier is required'
        };
      }
      // Parent modules can have spaces and mixed case
      if (!/^[a-zA-Z0-9\s-_]+$/.test(moduleData.module)) {
        return {
          success: false,
          message: 'Module identifier can contain letters, numbers, spaces, hyphens, and underscores'
        };
      }
    }

    // For child modules, validate submodule name and parent reference
    if (moduleData.submodule && moduleData.submodulename) {
      if (!moduleData.module) {
        return {
          success: false,
          message: 'Module identifier is required'
        };
      }
      if (!moduleData.submodule) {
        return {
          success: false,
          message: 'Parent module identifier is required for submodules'
        };
      }
    }

    const result = await MODULE.addModule(moduleData, createdBy);
    return result;
  } catch (error) {
    console.error('Error adding module:', error);
    return {
      success: false,
      message: error.message || 'Failed to add module'
    };
  }
}

export async function updateModule(moduleId, moduleData, modifiedBy) {
  try {
    // Validate required fields
    if (!moduleData.name) {
      return {
        success: false,
        message: 'Module name is required'
      };
    }

    // For parent modules, validate module identifier
    if (!moduleData.submodule && !moduleData.submodulename) {
      if (!moduleData.module) {
        return {
          success: false,
          message: 'Module identifier is required'
        };
      }
      // Parent modules can have spaces and mixed case
      if (!/^[a-zA-Z0-9\s-_]+$/.test(moduleData.module)) {
        return {
          success: false,
          message: 'Module identifier can contain letters, numbers, spaces, hyphens, and underscores'
        };
      }
    }

    // For child modules, validate submodule name and parent reference
    if (moduleData.submodule && moduleData.submodulename) {
      if (!moduleData.module) {
        return {
          success: false,
          message: 'Module identifier is required'
        };
      }
      if (!moduleData.submodule) {
        return {
          success: false,
          message: 'Parent module identifier is required for submodules'
        };
      }
    }

    const result = await MODULE.updateModule(moduleId, moduleData, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error updating module:', error);
    return {
      success: false,
      message: error.message || 'Failed to update module'
    };
  }
}

export async function deactivateModule(moduleId, modifiedBy) {
  try {
    const result = await MODULE.deactivateModule(moduleId, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error deactivating module:', error);
    return {
      success: false,
      message: error.message || 'Failed to deactivate module'
    };
  }
}

export async function activateModule(moduleId, modifiedBy) {
  try {
    const result = await MODULE.activateModule(moduleId, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error activating module:', error);
    return {
      success: false,
      message: error.message || 'Failed to activate module'
    };
  }
}

export async function checkModuleExists(moduleIdentifier) {
  try {
    const exists = await MODULE.moduleExists(moduleIdentifier);
    return {
      success: true,
      exists: exists
    };
  } catch (error) {
    console.error('Error checking module existence:', error);
    return {
      success: false,
      message: 'Failed to check module existence: ' + error.message
    };
  }
}
