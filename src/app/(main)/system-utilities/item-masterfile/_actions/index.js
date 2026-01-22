'use server';

import ITEM_MASTERFILE from '@/models/ItemMasterfile.js';

export async function getAllItems() {
  try {
    const items = await ITEM_MASTERFILE.getAllItems();
    return {
      success: true,
      data: items
    };
  } catch (error) {
    console.error('Error fetching items:', error);
    return {
      success: false,
      message: 'Failed to fetch items: ' + error.message
    };
  }
}

export async function getItemByNumber(itemNumber) {
  try {
    const item = await ITEM_MASTERFILE.getItemByNumber(itemNumber);
    return {
      success: true,
      data: item
    };
  } catch (error) {
    console.error('Error fetching item:', error);
    return {
      success: false,
      message: 'Failed to fetch item: ' + error.message
    };
  }
}

export async function addItem(itemData, createdBy) {
  try {
    // Validate required fields
    if (!itemData.itemNumber?.trim()) {
      return {
        success: false,
        message: 'Item number is required'
      };
    }

    const result = await ITEM_MASTERFILE.addItem(itemData, createdBy);
    return result;
  } catch (error) {
    console.error('Error adding item:', error);
    return {
      success: false,
      message: error.message || 'Failed to add item'
    };
  }
}

export async function updateItem(itemNumber, itemData, modifiedBy) {
  try {
    // Validate required fields
    if (!itemNumber?.trim()) {
      return {
        success: false,
        message: 'Item number is required'
      };
    }

    const result = await ITEM_MASTERFILE.updateItem(itemNumber, itemData, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error updating item:', error);
    return {
      success: false,
      message: error.message || 'Failed to update item'
    };
  }
}

export async function deleteItem(itemNumber) {
  try {
    const result = await ITEM_MASTERFILE.deleteItem(itemNumber);
    return result;
  } catch (error) {
    console.error('Error deleting item:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete item'
    };
  }
}

export async function checkItemExists(itemNumber) {
  try {
    const exists = await ITEM_MASTERFILE.itemExists(itemNumber);
    return {
      success: true,
      exists: exists
    };
  } catch (error) {
    console.error('Error checking item existence:', error);
    return {
      success: false,
      message: 'Failed to check item existence: ' + error.message
    };
  }
}

export async function searchItems(searchTerm) {
  try {
    const items = await ITEM_MASTERFiILE.searchItems(searchTerm);
    return {
      success: true,
      data: items
    };
  } catch (error) {
    console.error('Error searching items:', error);
    return {
      success: false,
      message: 'Failed to search items: ' + error.message
    };
  }
}

export async function activateItem(itemNumber, modifiedBy) {
  try {
    const result = await ITEM_MASTERFILE.activateItem(itemNumber, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error activating item:', error);
    return {
      success: false,
      message: error.message || 'Failed to activate item'
    };
  }
}

export async function deactivateItem(itemNumber, modifiedBy) {
  try {
    const result = await ITEM_MASTERFILE.deactivateItem(itemNumber, modifiedBy);
    return result;
  } catch (error) {
    console.error('Error deactivating item:', error);
    return {
      success: false,
      message: error.message || 'Failed to deactivate item'
    };
  }
}
