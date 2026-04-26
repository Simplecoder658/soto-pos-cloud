const ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet() {
  const menu = ss.getSheetByName("Menu").getDataRange().getValues();
  const users = ss.getSheetByName("Users").getDataRange().getValues();
  const orders = ss.getSheetByName("Orders").getDataRange().getValues();
  const config = ss.getSheetByName("Config").getRange("B1").getValue();

  const menuData = menu.slice(1).map(r => ({
    id: r[0], 
    name: r[1], 
    price: r[2], 
    category: r[3], 
    img: r[4], 
    options: (r[5] && typeof r[5] === 'string') ? r[5].split(",").map(o => o.trim()) : []
  }));

  const userData = users.slice(1).map(r => ({
    username: r[0], pin: r[1].toString(), role: r[2]
  }));

  return ContentService.createTextOutput(JSON.stringify({
    status: "SUCCESS", menu: menuData, users: userData, orders: orders.slice(1), shiftStatus: config
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === "saveOrder") {
    const sheet = ss.getSheetByName("Orders");
    data.cart.forEach(item => {
      sheet.appendRow([new Date(), data.noNota, item.name + (item.option ? " ("+item.option+")" : ""), item.qty, item.price * item.qty, data.method, data.kasir]);
    });
    return ContentService.createTextOutput(JSON.stringify({status: "OK"})).setMimeType(ContentService.MimeType.JSON);
  }
  if (data.action === "updateShift") {
    ss.getSheetByName("Config").getRange("B1").setValue(data.status);
    if (data.status === "CLOSED") {
      const orderSheet = ss.getSheetByName("Orders");
      if (orderSheet.getLastRow() > 1) orderSheet.deleteRows(2, orderSheet.getLastRow() - 1);
    }
    return ContentService.createTextOutput(JSON.stringify({status: "OK"})).setMimeType(ContentService.MimeType.JSON);
  }
}
