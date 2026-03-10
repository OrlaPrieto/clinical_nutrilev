/**
 * Script Integrado para Clinical Nutrilev
 * Soporta:
 * - GET: Para leer pacientes desde la App Angular
 * - POST: Para recibir nuevos registros (append) o actualizar notas (update)
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var jsonData = [];
    
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      jsonData.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"error": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "append"; 
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "GMT-6", "yyyy-MM-dd HH:mm:ss");
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    
    // Asegurar que existe la columna 'ultima_actualizacion'
    var updatedColIndex = headers.indexOf("ultima_actualizacion");
    if (updatedColIndex === -1) {
      updatedColIndex = headers.length;
      sheet.getRange(1, updatedColIndex + 1).setValue("ultima_actualizacion").setFontWeight("bold");
      headers.push("ultima_actualizacion");
    }

    if (action === "update") {
      var emailToFind = data.email;
      if (!emailToFind) throw new Error("Email requerido para actualizar");
      
      var emailColumnIndex = headers.indexOf("email");
      if (emailColumnIndex === -1) throw new Error("No se encontró la columna 'email'");
      
      var allData = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][emailColumnIndex].toString().toLowerCase() === emailToFind.toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        var notasColIndex = headers.indexOf("notas");
        if (notasColIndex === -1) {
          notasColIndex = headers.length;
          sheet.getRange(1, notasColIndex + 1).setValue("notas").setFontWeight("bold");
          headers.push("notas");
        }
        
        if (data.notas !== undefined) {
          sheet.getRange(rowIndex, notasColIndex + 1).setValue(data.notas);
        }
        
        // Actualizar fecha de última modificación
        sheet.getRange(rowIndex, updatedColIndex + 1).setValue(timestamp);
        
        return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Updated Successfully"}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === "append") {
      if (sheet.getLastRow() === 0 || headers[0] === "") {
        headers = Object.keys(data);
        if (headers.indexOf("ultima_actualizacion") === -1) headers.push("ultima_actualizacion");
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#fce7f3");
      }
      
      data["ultima_actualizacion"] = timestamp;
      
      var newRow = headers.map(function(header) {
        return data[header] || "";
      });
      
      sheet.appendRow(newRow);

      var recipient = Session.getEffectiveUser().getEmail(); 
      var subject = "🚨 Nueva Historia Clínica: " + (data.nombre || "Sin nombre");
      var body = "Se ha recibido una nueva historia clínica.\n\n" +
                 "👤 Paciente: " + (data.nombre || "N/A") + "\n" +
                 "📧 Correo: " + (data.email || "N/A") + "\n" +
                 "📅 Fecha: " + timestamp + "\n\n" +
                 "Puedes ver todos los detalles en tu hoja de Google Sheets.";
      
      MailApp.sendEmail(recipient, subject, body);
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Data appended"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
