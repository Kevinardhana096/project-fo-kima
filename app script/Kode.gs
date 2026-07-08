const PELANGGAN_ROOT_FOLDER_ID ='1TxupkWrrekUBKevLvIvv4qVbll0T4bL7';
const LOKASI_ROOT_FOLDER_ID = '1E435sI1Qo23OtK_6M4x72PUG_bauk1cE';
const SHEET_PELANGGAN = 'Pelanggan';
const LEGACY_SHEET_PELANGGAN = 'Perusahaan';
const SHEET_KONTRAK_LENGKAP = 'Kontrak Lengkap';
const KONTRAK_AKSI_COLUMN = 3;
const INTERNAL_API_SECRET_PROPERTY = 'APPS_SCRIPT_INTERNAL_SECRET';
const SHARING_CORE_OPTIONS = ['', '1/2', '1/4', '1/8', '1/16', '1/32'];
const KATEGORI_OPTIONS = ['', 'BAK (Berita Acara Kesepakatan)', 'Kontrak/Perjanjian Induk'];
const KONTRAK_LENGKAP_HEADERS = [
  'No',
  'ID Kontrak',
  'Aksi',
  'Kategori',
  'Kode Pelanggan',
  'Nama Pelanggan',
  'Lokasi',
  'Sisa Waktu',
  'Periode Awal',
  'Durasi Kontrak',
  'Periode Berakhir',
  'No Kontrak',
  'Core',
  'Sharing Core',
  'Nilai Kontrak',
  'Biaya Aktivasi',
  'Perbulan',
  'Nilai Periode Aktif',
  'Status Kontrak',
  'Berkas',
  'Billing',
  'Keterangan',
  'ID Kontrak Sebelumnya'
];

function doGet(e) {
  return handleApiRequest_(e, 'get');
}

function doPost(e) {
  return handleApiRequest_(e, 'post');
}

function handleApiRequest_(e, method) {
  try {
    assertInternalApiAuthorized_(e, method);

    if (method === 'get') {
      return handleApiGet_(e);
    }

    if (method === 'post') {
      return handleApiPost_(e);
    }

    return jsonResponse_({
      success: false,
      status: 405,
      error: {
        code: 'method_not_allowed',
        message: 'Method tidak didukung.'
      }
    });
  } catch (error) {
    return toErrorResponse_(error);
  }
}

function handleApiGet_(e) {
  const resource = String((e && e.parameter && e.parameter.resource) || '').trim().toLowerCase();
  if (resource === 'companies' || resource === 'customers') {
    const companyId = String((e && e.parameter && e.parameter.id) || '').trim();
    if (companyId) {
      const record = getPelangganRecordById_(companyId);
      if (!record) {
        throw createApiError_('company_not_found', 'Data pelanggan tidak ditemukan.', 404);
      }

      return jsonResponse_({
        success: true,
        status: 200,
        data: record
      });
    }

    return jsonResponse_({
      success: true,
      status: 200,
      data: listPelangganRecords_()
    });
  }

  if (resource === 'contracts') {
    reconcileKontrakStatusColumn_();

    const contractId = String((e && e.parameter && e.parameter.id) || '').trim();
    if (contractId) {
      const record = getKontrakRecordById_(contractId);
      if (!record) {
        throw createApiError_('contract_not_found', 'Data kontrak tidak ditemukan.', 404);
      }

      return jsonResponse_({
        success: true,
        status: 200,
        data: record
      });
    }

    return jsonResponse_({
      success: true,
      status: 200,
      data: listKontrakRecords_()
    });
  }

  throw createApiError_('resource_not_found', 'Resource API tidak dikenali.', 404);
}

function handleApiPost_(e) {
  const payload = parseJsonBody_(e);
  const action = String((payload && payload.action) || '').trim().toLowerCase();

  if (action === 'create_company' || action === 'create_customer') {
    const result = savePelanggan({
      kodePelanggan: String(payload.kodePelanggan || '').trim(),
      namaPelanggan: String(payload.namaPelanggan || '').trim(),
      pic: payload.pic || '',
      telepon: payload.telepon || '',
      email: payload.email || '',
      keterangan: payload.keterangan || '',
      uploadItems: payload.uploadItems || []
    });

    const createdRecord = getPelangganRecordById_(result.customerRecordId);
    return jsonResponse_({
      success: true,
      status: 201,
      message: result.message,
      data: createdRecord
    });
  }

  if (action === 'update_company' || action === 'update_customer') {
    const result = updatePelanggan({
      id: payload.id || '',
      kodePelanggan: String(payload.kodePelanggan || '').trim(),
      namaPelanggan: String(payload.namaPelanggan || '').trim(),
      pic: payload.pic || '',
      telepon: payload.telepon || '',
      email: payload.email || '',
      keterangan: payload.keterangan || '',
      deleteFileIds: payload.deleteFileIds || [],
      uploadItems: payload.uploadItems || []
    });

    const updatedRecord = getPelangganRecordById_(result.customerRecordId);
    return jsonResponse_({
      success: true,
      status: 200,
      message: result.message,
      data: updatedRecord
    });
  }

  if (action === 'delete_company' || action === 'delete_customer') {
    const deletedRecord = deletePelangganById_(payload.id);
    return jsonResponse_({
      success: true,
      status: 200,
      message: 'Data pelanggan berhasil dihapus.',
      data: deletedRecord
    });
  }

  throw createApiError_('action_not_supported', 'Action API tidak dikenali.', 404);
}

function assertInternalApiAuthorized_(e, method) {
  const expectedSecret = getInternalApiSecret_();
  if (!expectedSecret) {
    throw createApiError_(
      'secret_not_configured',
      `Secret internal API belum diset pada Script Properties (${INTERNAL_API_SECRET_PROPERTY}).`,
      500
    );
  }

  const providedSecret = method === 'get'
    ? String((e && e.parameter && e.parameter.token) || '').trim()
    : String((parseJsonBody_(e).token) || '').trim();

  if (!providedSecret || providedSecret !== expectedSecret) {
    throw createApiError_('unauthorized', 'Akses API tidak diizinkan.', 401);
  }
}

function getInternalApiSecret_() {
  return String(PropertiesService.getScriptProperties().getProperty(INTERNAL_API_SECRET_PROPERTY) || '').trim();
}

function parseJsonBody_(e) {
  const rawBody = e && e.postData && e.postData.contents;
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw createApiError_('invalid_json', 'Body JSON tidak valid.', 400);
  }
}

function createApiError_(code, message, status) {
  const error = new Error(message);
  error.apiCode = code;
  error.apiStatus = status || 400;
  return error;
}

function toErrorResponse_(error) {
  return jsonResponse_({
    success: false,
    status: Number(error && error.apiStatus) || 500,
    error: {
      code: String((error && error.apiCode) || 'internal_error'),
      message: String((error && error.message) || 'Terjadi kesalahan internal.')
    }
  });
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  ensureKontrakAksiColumn_();
  ensureKontrakFormulaColumns_();
  reconcileKontrakStatusColumn_();

  SpreadsheetApp.getUi()
    .createMenu('Pelanggan')
    .addItem('Tambah Pelanggan', 'showTambahPelangganForm')
    .addToUi();

  SpreadsheetApp.getUi()
    .createMenu('Lokasi')
    .addItem('Tambah Kontrak Lokasi', 'showTambahKontrakLokasiForm')
    .addItem('Aktifkan Trigger Aksi Kontrak', 'installKontrakAksiTrigger_')
    .addItem('Reset Validasi Aksi Kontrak', 'resetKontrakAksiValidation_')
    .addToUi();
}

function ensureKontrakAksiColumn_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) return;

  sheet.getRange(1, KONTRAK_AKSI_COLUMN).setValue(KONTRAK_LENGKAP_HEADERS[KONTRAK_AKSI_COLUMN - 1]);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, KONTRAK_AKSI_COLUMN, lastRow - 1, 1);
  const values = range.getValues();
  const normalized = values.map(row => {
    const value = row[0];
    return [typeof value === 'boolean' ? '' : value];
  });

  range.setValues(normalized);
}

function resetKontrakAksiValidation_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const maxRows = sheet.getMaxRows();
  if (maxRows < 2) return;

  const range = sheet.getRange(2, KONTRAK_AKSI_COLUMN, maxRows - 1, 1);
  range.clearDataValidations();
  range.clearContent();
}

function ensureKontrakFormulaColumns_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) return;

  const sisaWaktuCell = sheet.getRange(2, 8);
  const sisaWaktuFormula = sisaWaktuCell.getFormula();
  if (shouldRefreshKontrakFormula_(sisaWaktuCell, sisaWaktuFormula)) {
    clearFormulaSpillRange_(sheet, 8);
    sisaWaktuCell.setFormula(
      '=ARRAYFORMULA(IF(K2:K="";"";IF(K2:K<TODAY();"Sudah berakhir";IF(K2:K=TODAY();"Berakhir hari ini";IF(((YEAR(K2:K)-YEAR(TODAY()))*12+MONTH(K2:K)-MONTH(TODAY())-(DAY(K2:K)<DAY(TODAY())))>=1;((YEAR(K2:K)-YEAR(TODAY()))*12+MONTH(K2:K)-MONTH(TODAY())-(DAY(K2:K)<DAY(TODAY())))&" bulan lagi";K2:K-TODAY()&" hari lagi")))))'
    );
  }

  const durasiKontrakCell = sheet.getRange(2, 10);
  const durasiKontrakFormula = durasiKontrakCell.getFormula();
  if (shouldRefreshKontrakFormula_(durasiKontrakCell, durasiKontrakFormula)) {
    clearFormulaSpillRange_(sheet, 10);
    durasiKontrakCell.setFormula(
      '=ARRAYFORMULA(IF((I2:I="")+(K2:K="");"";((YEAR(K2:K)-YEAR(I2:I))*12+MONTH(K2:K)-MONTH(I2:I)+(DAY(K2:K)>=DAY(I2:I)))))'
    );
  }
}

function shouldRefreshKontrakFormula_(cell, formula) {
  if (!formula) return true;
  if (String(formula).includes('MAP(')) return true;
  if (String(formula).includes(',')) return true;
  return cell.getDisplayValue() === '#ERROR!';
}

function clearFormulaSpillRange_(sheet, column) {
  const maxRows = sheet.getMaxRows();
  if (maxRows <= 2) return;

  sheet.getRange(3, column, maxRows - 2, 1).clearContent();
}

function showTambahPelangganForm() {
  const html = HtmlService.createTemplateFromFile('TambahPelanggan')
    .evaluate()
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tambah Pelanggan');
}

function showEditPelangganForm_(rowNumber) {
  const template = HtmlService.createTemplateFromFile('EditPelanggan');
  template.rowNumber = Number(rowNumber) || '';
  const html = template.evaluate()
    .setWidth(600)
    .setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(html, 'Edit Pelanggan');
}

function showPerpanjanganKontrakForm_(rowNumber) {
  const template = HtmlService.createTemplateFromFile('PerpanjangKontrakLokasi');
  template.sourceRowNumber = Number(rowNumber) || '';
  const html = template.evaluate()
    .setWidth(860)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Perpanjangan Kontrak Lokasi');
}

function showUpgradeKontrakLokasiForm_(rowNumber) {
  const template = HtmlService.createTemplateFromFile('UpgradeKontrakLokasi');
  template.sourceRowNumber = Number(rowNumber) || '';
  const html = template.evaluate()
    .setWidth(860)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Upgrade Kontrak Lokasi');
}

function showTambahKontrakLokasiForm() {
  const html = HtmlService.createTemplateFromFile('TambahKontrakLokasi')
    .evaluate()
    .setWidth(860)
    .setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tambah Kontrak Lokasi');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function findSheetByNames_(sheetNames) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  for (let index = 0; index < sheetNames.length; index += 1) {
    const sheet = spreadsheet.getSheetByName(sheetNames[index]);
    if (sheet) return sheet;
  }

  return null;
}

function isPelangganSheet_(sheet) {
  if (!sheet) return false;
  const sheetName = sheet.getName();
  return sheetName === SHEET_PELANGGAN || sheetName === LEGACY_SHEET_PELANGGAN;
}

function getPelangganOptions() {
  const sheet = getPelangganSheet_();
  if (!sheet) {
    throw new Error('Sheet pelanggan tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  return values
    .filter(row => row[2])
    .map(row => ({
      no: row[0],
      kodePelanggan: String(row[1] || '').trim(),
      namaPelanggan: String(row[2] || '').trim()
    }));
}

function listPelangganRecords_() {
  const sheet = getPelangganSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 10)).getValues();
  return values
    .map((rowValues, index) => buildPelangganRecord_(rowValues, index + 2))
    .filter(record => record && record.namaPelanggan);
}

function getPelangganRecordById_(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) {
    throw createApiError_('invalid_company_id', 'ID pelanggan tidak valid.', 400);
  }

  const match = findPelangganRecordMatch_(normalizedIdentifier);
  return match ? match.record : null;
}

function getPelangganByRow(rowNumber) {
  const row = Number(rowNumber);
  if (!row || row < 2) {
    throw createApiError_('invalid_company_row', 'Baris pelanggan tidak valid.', 400);
  }

  const sheet = getPelangganSheet_();
  const rowValues = sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), 10)).getValues()[0];
  const record = buildPelangganRecord_(rowValues, row);
  if (!record) {
    throw createApiError_('company_not_found', 'Data pelanggan tidak ditemukan.', 404);
  }

  record.existingFiles = listPelangganFilesByFolderUrl_(record.berkasPelanggan);

  return record;
}

function deletePelangganById_(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) {
    throw createApiError_('invalid_company_id', 'ID pelanggan tidak valid.', 400);
  }

  const match = findPelangganRecordMatch_(normalizedIdentifier);
  if (!match) {
    throw createApiError_('company_not_found', 'Data pelanggan tidak ditemukan.', 404);
  }

  getPelangganSheet_().deleteRow(match.rowNumber);
  return match.record;
}

function updatePelanggan(formData) {
  const normalizedId = String((formData && formData.id) || '').trim();
  if (!normalizedId) {
    throw createApiError_('invalid_company_id', 'ID pelanggan tidak valid.', 400);
  }

  const sheet = getPelangganSheet_();
  const match = findPelangganRecordMatch_(normalizedId);
  if (!match) {
    throw createApiError_('company_not_found', 'Data pelanggan tidak ditemukan.', 404);
  }

  const normalizedData = validatePelangganFormData_(formData, normalizedId);

  const currentValues = sheet.getRange(match.rowNumber, 1, 1, Math.max(sheet.getLastColumn(), 10)).getValues()[0];
  const nextKodePelanggan = normalizedData.kodePelanggan;
  const nextNamaPelanggan = normalizedData.namaPelanggan;
  const currentFolderUrl = String(currentValues[7] || '').trim();
  const targetFolder = syncPelangganFolderForUpdate_(currentFolderUrl, nextKodePelanggan, nextNamaPelanggan);

  const rowData = [
    currentValues[0],
    nextKodePelanggan,
    nextNamaPelanggan,
    currentValues[3] || '',
    normalizedData.pic,
    normalizedData.telepon,
    normalizedData.email,
    targetFolder.getUrl(),
    normalizedData.keterangan,
    currentValues[9] || ''
  ];

  trashFilesByIds_((formData && formData.deleteFileIds) || []);
  uploadFilesToTargetFolder(targetFolder, normalizedData.uploadItems || []);
  sheet.getRange(match.rowNumber, 1, 1, rowData.length).setValues([rowData]);

  const pelangganRecord = buildPelangganRecord_(rowData, match.rowNumber);

  return {
    success: true,
    message: 'Data pelanggan berhasil diperbarui.',
    customerRecordId: pelangganRecord ? pelangganRecord.id : normalizedId
  };
}

function findPelangganRecordMatch_(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) return null;

  const sheet = getPelangganSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 10)).getValues();
  for (let index = 0; index < values.length; index += 1) {
    const rowNumber = index + 2;
    const record = buildPelangganRecord_(values[index], rowNumber);
    if (record && record.id === normalizedIdentifier) {
      return {
        rowNumber,
        record
      };
    }
  }

  return null;
}

function getPelangganSheet_() {
  const sheet = findSheetByNames_([SHEET_PELANGGAN, LEGACY_SHEET_PELANGGAN]);
  if (!sheet) {
    throw createApiError_(
      'sheet_not_found',
      `Sheet pelanggan tidak ditemukan. Gunakan nama tab "${SHEET_PELANGGAN}" atau "${LEGACY_SHEET_PELANGGAN}".`,
      500
    );
  }

  return sheet;
}

function buildPelangganRecord_(rowValues, rowNumber) {
  if (!rowValues) return null;

  const no = rowValues[0];
  const kodePelanggan = String(rowValues[1] || '').trim();
  const namaPelanggan = String(rowValues[2] || '').trim();
  if (!kodePelanggan && !namaPelanggan && !String(no || '').trim()) {
    return null;
  }

  const stableId = kodePelanggan
    ? `kode:${kodePelanggan}`
    : `no:${String(no || rowNumber || '').trim()}`;
  const berkasPelanggan = String(rowValues[7] || '').trim();

  return {
    id: stableId,
    no: Number(no) || rowNumber || '',
    kodePelanggan,
    namaPelanggan,
    kontrakAktif: String(rowValues[3] || '').trim(),
    pic: String(rowValues[4] || '').trim(),
    telepon: String(rowValues[5] || '').trim(),
    email: String(rowValues[6] || '').trim(),
    berkasPelanggan,
    keterangan: String(rowValues[8] || '').trim(),
    aksi: String(rowValues[9] || '').trim()
  };
}

function listKontrakRecords_() {
  const sheet = getKontrakSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const totalRows = lastRow - 1;
  const values = sheet.getRange(2, 1, totalRows, KONTRAK_LENGKAP_HEADERS.length).getValues();
  const noKontrakRichTexts = sheet.getRange(2, 12, totalRows, 1).getRichTextValues();

  return values
    .map((rowValues, index) => buildKontrakRecord_(rowValues, index + 2, noKontrakRichTexts[index][0]))
    .filter(record => record && record.idKontrak);
}

function getKontrakRecordById_(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) {
    throw createApiError_('invalid_contract_id', 'ID kontrak tidak valid.', 400);
  }

  const match = findKontrakRecordMatch_(normalizedIdentifier);
  return match ? match.record : null;
}

function findKontrakRecordMatch_(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) return null;

  const sheet = getKontrakSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const totalRows = lastRow - 1;
  const values = sheet.getRange(2, 1, totalRows, KONTRAK_LENGKAP_HEADERS.length).getValues();
  const noKontrakRichTexts = sheet.getRange(2, 12, totalRows, 1).getRichTextValues();

  for (let index = 0; index < values.length; index += 1) {
    const rowNumber = index + 2;
    const record = buildKontrakRecord_(values[index], rowNumber, noKontrakRichTexts[index][0]);
    if (record && record.id === normalizedIdentifier) {
      return {
        rowNumber,
        record
      };
    }
  }

  return null;
}

function getKontrakSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw createApiError_('sheet_not_found', 'Sheet Kontrak Lengkap tidak ditemukan.', 500);
  }

  return sheet;
}

function buildKontrakRecord_(rowValues, rowNumber, noKontrakRichText) {
  if (!rowValues) return null;

  const idKontrak = String(rowValues[1] || '').trim();
  if (!idKontrak) return null;

  const noKontrakText = String(rowValues[11] || '').trim();
  const noKontrakUrl = noKontrakRichText && noKontrakRichText.getLinkUrl
    ? String(noKontrakRichText.getLinkUrl() || '').trim()
    : '';
  const core = String(rowValues[12] || '').trim();
  const sharingCore = String(rowValues[13] || '').trim();
  const kodePelanggan = String(rowValues[4] || '').trim();
  const namaPelanggan = String(rowValues[5] || '').trim();

  return {
    id: `kontrak:${idKontrak}`,
    rowNumber,
    no: Number(rowValues[0]) || rowNumber || '',
    idKontrak,
    aksi: String(rowValues[2] || '').trim(),
    kategori: String(rowValues[3] || '').trim(),
    previousIdKontrak: String(rowValues[22] || '').trim(),
    kodePelanggan,
    namaPelanggan,
    lokasi: String(rowValues[6] || '').trim(),
    sisaWaktu: String(rowValues[7] || '').trim(),
    periodeAwal: formatDateForInput(rowValues[8]),
    durasiKontrak: extractNumber(rowValues[9]),
    periodeBerakhir: formatDateForInput(rowValues[10]),
    noKontrak: noKontrakText,
    noKontrakUrl,
    core,
    sharingCore,
    paket: buildPaketLabel_(core, sharingCore),
    nilaiKontrak: toNumber(rowValues[14]),
    biayaAktivasi: toNumber(rowValues[15]),
    perbulan: toNumber(rowValues[16]),
    nilaiPeriodeAktif: toNumber(rowValues[17]),
    statusKontrak: String(rowValues[18] || '').trim(),
    berkasUrl: String(rowValues[19] || '').trim(),
    billingLabel: String(rowValues[20] || '').trim(),
    keterangan: String(rowValues[21] || '').trim()
  };
}

function normalizePelangganFormData_(formData) {
  return {
    kodePelanggan: String((formData && formData.kodePelanggan) || '').trim(),
    namaPelanggan: String((formData && formData.namaPelanggan) || '').trim(),
    pic: String((formData && formData.pic) || '').trim(),
    telepon: String((formData && formData.telepon) || '').trim(),
    email: String((formData && formData.email) || '').trim(),
    keterangan: String((formData && formData.keterangan) || '').trim(),
    uploadItems: (formData && formData.uploadItems) || []
  };
}

function validatePelangganFormData_(formData, currentCompanyId) {
  const normalizedData = normalizePelangganFormData_(formData);

  if (!normalizedData.namaPelanggan) {
    throw createApiError_('invalid_company_name', 'Nama Pelanggan wajib diisi.', 400);
  }

  if (normalizedData.kodePelanggan) {
    const duplicate = findPelangganDuplicateCode_(normalizedData.kodePelanggan, currentCompanyId);
    if (duplicate) {
      throw createApiError_(
        'duplicate_company_code',
        `Kode pelanggan "${normalizedData.kodePelanggan}" sudah dipakai oleh ${duplicate.namaPelanggan}.`,
        409
      );
    }
  }

  return normalizedData;
}

function findPelangganDuplicateCode_(kodePelanggan, currentCompanyId) {
  const normalizedCode = String(kodePelanggan || '').trim();
  if (!normalizedCode) return null;

  const normalizedCurrentId = String(currentCompanyId || '').trim();
  const records = listPelangganRecords_();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.kodePelanggan !== normalizedCode) continue;
    if (normalizedCurrentId && record.id === normalizedCurrentId) continue;
    return record;
  }

  return null;
}

function saveKontrakLokasi(formData) {
  validateKontrakFormData(formData);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const normalizedData = normalizeKontrakFormData(formData);
  const periodeFolder = getOrCreateKontrakPeriodeFolder(
    normalizedData.lokasi,
    normalizedData.periodeAwal,
    normalizedData.periodeBerakhir
  );
  const uploadedFiles = uploadFilesToTargetFolder(periodeFolder, normalizedData.uploadItems);
  const latestContractFile = getLatestContractFile(uploadedFiles);

  const rowData = [
    getNextNumber(SHEET_KONTRAK_LENGKAP),
    generateContractId(),
    '',
    normalizedData.kategori,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi,
    '',
    normalizedData.periodeAwal,
    '',
    normalizedData.periodeBerakhir,
    normalizedData.noKontrak,
    normalizedData.core,
    normalizedData.sharingCore,
    normalizedData.nilaiKontrak,
    normalizedData.biayaAktivasi,
    normalizedData.perbulan,
    normalizedData.nilaiPeriodeAktif,
    normalizedData.statusKontrak,
    periodeFolder.getUrl(),
    'Lihat Billing',
    normalizedData.keterangan,
    ''
  ];

  const newRow = getNextKontrakDataRow_(sheet);
  setKontrakRowData_(sheet, newRow, rowData);
  ensureKontrakFormulaColumns_();
  reconcileKontrakStatusColumn_();
  sheet.getRange(newRow, KONTRAK_AKSI_COLUMN).clearContent();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  sheet.setActiveRange(sheet.getRange(newRow, 1, 1, KONTRAK_LENGKAP_HEADERS.length));

  if (latestContractFile && normalizedData.noKontrak) {
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(normalizedData.noKontrak)
      .setLinkUrl(latestContractFile.url)
      .build();

    sheet.getRange(newRow, 12).setRichTextValue(richText);
  }

  return {
    success: true,
    message: 'Kontrak lokasi berhasil disimpan.'
  };
}

function validateKontrakFormData(formData) {
  if (!formData) {
    throw new Error('Data form tidak ditemukan.');
  }

  const normalizedCoreFields = normalizeKontrakCoreFields_(formData);

  if (!String(formData.namaPelanggan || '').trim()) {
    throw new Error('Pelanggan wajib dipilih.');
  }

  if (!String(formData.kodePelanggan || '').trim()) {
    throw new Error('Kode pelanggan wajib terisi.');
  }

  if (!String(formData.lokasi || '').trim()) {
    throw new Error('Lokasi wajib diisi.');
  }

  validateKategoriValue_(formData && formData.kategori);

  if (!normalizedCoreFields.core && !normalizedCoreFields.sharingCore) {
    throw new Error('Pilih salah satu: Core atau Sharing Core.');
  }

  if (normalizedCoreFields.core && normalizedCoreFields.sharingCore) {
    throw new Error('Core dan Sharing Core tidak boleh diisi bersamaan.');
  }

  if (!String(formData.periodeAwal || '').trim()) {
    throw new Error('Periode Awal wajib diisi.');
  }

  if (!String(formData.durasiKontrak || '').trim() && !String(formData.periodeBerakhir || '').trim()) {
    throw new Error('Isi Durasi Kontrak atau Periode Berakhir.');
  }

  if (!String(formData.perbulan || '').trim()) {
    throw new Error('Perbulan wajib diisi.');
  }
}

function getNextKontrakDataRow_(sheet) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < 2) {
    sheet.insertRowAfter(1);
    return 2;
  }

  const idValues = sheet.getRange(2, 2, maxRows - 1, 1).getValues();
  for (let index = 0; index < idValues.length; index += 1) {
    if (!String(idValues[index][0] || '').trim()) {
      return index + 2;
    }
  }

  sheet.insertRowAfter(maxRows);
  return maxRows + 1;
}

function setKontrakRowData_(sheet, row, rowData) {
  sheet.getRange(row, 1, 1, 7).setValues([rowData.slice(0, 7)]);
  sheet.getRange(row, 9).setValue(rowData[8]);
  sheet.getRange(row, 11, 1, 9).setValues([rowData.slice(10, 19)]);
  sheet.getRange(row, 20, 1, 4).setValues([rowData.slice(19, 23)]);
}

function normalizeKontrakFormData(formData) {
  const periodeAwal = new Date(formData.periodeAwal);
  const durasiInput = Number(formData.durasiKontrak || 0);
  let periodeBerakhir = formData.periodeBerakhir ? new Date(formData.periodeBerakhir) : '';

  if (!periodeBerakhir && durasiInput > 0) {
    periodeBerakhir = calculateEndDate(periodeAwal, durasiInput);
  }

  const durasiKontrak = durasiInput || calculateDurationMonths(periodeAwal, periodeBerakhir);
  if (!periodeBerakhir || !durasiKontrak) {
    throw new Error('Periode kontrak tidak valid.');
  }

  if (durasiInput > 0 && formData.periodeBerakhir) {
    const expectedEndDate = calculateEndDate(periodeAwal, durasiInput);
    if (!isSameDate(expectedEndDate, periodeBerakhir)) {
      throw new Error('Durasi Kontrak tidak cocok dengan Periode Berakhir.');
    }
  }

  const normalizedCoreFields = normalizeKontrakCoreFields_(formData);

  return {
    kategori: String(formData.kategori || '').trim(),
    kodePelanggan: String(formData.kodePelanggan || '').trim(),
    namaPelanggan: String(formData.namaPelanggan || '').trim(),
    lokasi: String(formData.lokasi || '').trim(),
    core: normalizedCoreFields.core,
    sharingCore: normalizedCoreFields.sharingCore,
    paket: buildPaketLabel_(normalizedCoreFields.core, normalizedCoreFields.sharingCore),
    periodeAwal,
    periodeBerakhir,
    durasiKontrak,
    noKontrak: String(formData.noKontrak || '').trim(),
    nilaiKontrak: toNumber(formData.nilaiKontrak),
    biayaAktivasi: toNumber(formData.biayaAktivasi),
    perbulan: toNumber(formData.perbulan),
    nilaiPeriodeAktif: toNumber(formData.perbulan) * durasiKontrak,
    statusKontrak: calculateKontrakLifecycleStatus_(periodeAwal, periodeBerakhir),
    keterangan: String(formData.keterangan || '').trim(),
    uploadItems: formData.uploadItems || []
  };
}

function normalizeKontrakCoreFields_(formData) {
  const core = String((formData && formData.core) || '').trim();
  const sharingCore = String((formData && formData.sharingCore) || '').trim();
  const legacyPaket = String((formData && formData.paket) || '').trim();

  validateSharingCoreValue_(sharingCore);

  if (core || sharingCore || !legacyPaket) {
    return {
      core,
      sharingCore
    };
  }

  return {
    core: legacyPaket,
    sharingCore: ''
  };
}

function buildPaketLabel_(core, sharingCore) {
  const values = [String(core || '').trim(), String(sharingCore || '').trim()].filter(Boolean);
  return values.join(' / ');
}

function validateSharingCoreValue_(sharingCore) {
  const normalizedValue = String(sharingCore || '').trim();
  if (SHARING_CORE_OPTIONS.includes(normalizedValue)) {
    return;
  }

  throw new Error(`Sharing Core tidak valid. Pilihan yang tersedia: ${SHARING_CORE_OPTIONS.filter(Boolean).join(', ')}.`);
}

function validateKategoriValue_(kategori) {
  const normalizedValue = String(kategori || '').trim();
  if (KATEGORI_OPTIONS.includes(normalizedValue)) {
    return;
  }

  throw new Error(`Kategori tidak valid. Pilihan yang tersedia: ${KATEGORI_OPTIONS.filter(Boolean).join(', ')}.`);
}

function getKontrakLokasiByRow(rowNumber) {
  const row = Number(rowNumber);
  if (!row || row < 2) {
    throw new Error('Baris kontrak tidak valid.');
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const values = sheet.getRange(row, 1, 1, KONTRAK_LENGKAP_HEADERS.length).getValues()[0];
  if (!values[1]) {
    throw new Error('Data kontrak pada baris tersebut tidak ditemukan.');
  }

  return {
    rowNumber: row,
    idKontrak: values[1],
    kategori: String(values[3] || '').trim(),
    previousIdKontrak: String(values[22] || '').trim(),
    kodePelanggan: String(values[4] || '').trim(),
    namaPelanggan: String(values[5] || '').trim(),
    lokasi: String(values[6] || '').trim(),
    periodeAwal: formatDateForInput(values[8]),
    durasiKontrak: extractNumber(values[9]),
    periodeBerakhir: formatDateForInput(values[10]),
    noKontrak: String(values[11] || '').trim(),
    core: String(values[12] || '').trim(),
    sharingCore: String(values[13] || '').trim(),
    paket: buildPaketLabel_(values[12], values[13]),
    nilaiKontrak: toNumber(values[14]),
    biayaAktivasi: toNumber(values[15]),
    perbulan: toNumber(values[16]),
    statusKontrak: String(values[18] || '').trim(),
    keterangan: String(values[21] || '').trim(),
    berkasFolderUrl: String(values[19] || '').trim(),
    existingFiles: listKontrakFilesByFolderUrl_(values[19])
  };
}

function getKontrakPerpanjanganCandidates() {
  reconcileKontrakStatusColumn_();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, KONTRAK_LENGKAP_HEADERS.length).getValues();
  return values
    .map((row, index) => buildKontrakPerpanjanganCandidate_(row, index + 2))
    .filter(candidate => candidate && candidate.isEligible);
}

function getKontrakUpgradeCandidates() {
  reconcileKontrakStatusColumn_();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, KONTRAK_LENGKAP_HEADERS.length).getValues();
  return values
    .map((row, index) => buildKontrakUpgradeCandidate_(row, index + 2))
    .filter(candidate => candidate && candidate.isEligible);
}

function buildKontrakPerpanjanganCandidate_(rowValues, rowNumber) {
  const idKontrak = String(rowValues[1] || '').trim();
  if (!idKontrak) return null;
  const statusKontrak = String(rowValues[18] || '').trim();
  const core = String(rowValues[12] || '').trim();
  const sharingCore = String(rowValues[13] || '').trim();

  return {
    rowNumber,
    idKontrak,
    kategori: String(rowValues[3] || '').trim(),
    kodePelanggan: String(rowValues[4] || '').trim(),
    namaPelanggan: String(rowValues[5] || '').trim(),
    lokasi: String(rowValues[6] || '').trim(),
    periodeAwal: formatDateForInput(rowValues[8]),
    periodeBerakhir: formatDateForInput(rowValues[10]),
    noKontrak: String(rowValues[11] || '').trim(),
    core,
    sharingCore,
    paket: buildPaketLabel_(core, sharingCore),
    statusKontrak,
    previousIdKontrak: String(rowValues[22] || '').trim(),
    isEligible: isKontrakEligibleForPerpanjangan_(rowValues[1]) &&
      isLatestKontrakInSameGroup_(rowNumber, rowValues[4], rowValues[5], rowValues[6])
  };
}

function buildKontrakUpgradeCandidate_(rowValues, rowNumber) {
  const idKontrak = String(rowValues[1] || '').trim();
  if (!idKontrak) return null;
  const statusKontrak = String(rowValues[18] || '').trim();
  const core = String(rowValues[12] || '').trim();
  const sharingCore = String(rowValues[13] || '').trim();

  return {
    rowNumber,
    idKontrak,
    kategori: String(rowValues[3] || '').trim(),
    kodePelanggan: String(rowValues[4] || '').trim(),
    namaPelanggan: String(rowValues[5] || '').trim(),
    lokasi: String(rowValues[6] || '').trim(),
    periodeAwal: formatDateForInput(rowValues[8]),
    periodeBerakhir: formatDateForInput(rowValues[10]),
    noKontrak: String(rowValues[11] || '').trim(),
    core,
    sharingCore,
    paket: buildPaketLabel_(core, sharingCore),
    statusKontrak,
    previousIdKontrak: String(rowValues[22] || '').trim(),
    isEligible: isKontrakEligibleForUpgrade_(rowValues[1]) &&
      isLatestKontrakInSameGroup_(rowNumber, rowValues[4], rowValues[5], rowValues[6])
  };
}

function isKontrakEligibleForPerpanjangan_(idKontrak) {
  const normalizedId = String(idKontrak || '').trim();
  if (!normalizedId) return false;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 1, lastRow - 1, KONTRAK_LENGKAP_HEADERS.length).getValues();
  const sourceRow = values.find(row => String(row[1] || '').trim() === normalizedId);
  if (!sourceRow) return false;

  const statusKontrak = String(sourceRow[18] || '').trim().toLowerCase();
  if (statusKontrak !== 'aktif' && statusKontrak !== 'berakhir') return false;
  if (statusKontrak === 'diperpanjang') return false;

  return !values.some(row => String(row[22] || '').trim() === normalizedId);
}

function isKontrakEligibleForUpgrade_(idKontrak) {
  const normalizedId = String(idKontrak || '').trim();
  if (!normalizedId) return false;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 1, lastRow - 1, KONTRAK_LENGKAP_HEADERS.length).getValues();
  const sourceRow = values.find(row => String(row[1] || '').trim() === normalizedId);
  if (!sourceRow) return false;

  const statusKontrak = String(sourceRow[18] || '').trim().toLowerCase();
  if (statusKontrak !== 'aktif') return false;

  return !values.some(row => String(row[22] || '').trim() === normalizedId);
}

function getKontrakPerpanjanganSourceByRow(rowNumber) {
  reconcileKontrakStatusColumn_();

  const kontrak = getKontrakLokasiByRow(rowNumber);
  if (!isKontrakEligibleForPerpanjangan_(kontrak.idKontrak)) {
    throw new Error('Kontrak ini tidak bisa diperpanjang lagi karena sudah memiliki kontrak turunan atau statusnya sudah diperpanjang.');
  }

  if (!isLatestKontrakInSameGroup_(rowNumber, kontrak.kodePelanggan, kontrak.namaPelanggan, kontrak.lokasi)) {
    throw new Error('Hanya kontrak terbaru pada grup pelanggan dan lokasi yang sama yang boleh diperpanjang.');
  }

  return kontrak;
}

function getKontrakUpgradeSourceByRow(rowNumber) {
  reconcileKontrakStatusColumn_();

  const kontrak = getKontrakLokasiByRow(rowNumber);
  if (!isKontrakEligibleForUpgrade_(kontrak.idKontrak)) {
    throw new Error('Kontrak ini tidak bisa di-upgrade karena bukan kontrak aktif terbaru atau sudah memiliki kontrak turunan.');
  }

  if (!isLatestKontrakInSameGroup_(rowNumber, kontrak.kodePelanggan, kontrak.namaPelanggan, kontrak.lokasi)) {
    throw new Error('Hanya kontrak aktif terbaru pada grup pelanggan dan lokasi yang sama yang boleh di-upgrade.');
  }

  return kontrak;
}

function isLatestKontrakInSameGroup_(rowNumber, kodePelanggan, namaPelanggan, lokasi) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 5, lastRow - 1, 3).getValues();
  let lastMatchingRow = 0;

  values.forEach((rowValues, index) => {
    const candidateRow = index + 2;
    const candidateKode = String(rowValues[0] || '').trim();
    const candidateNama = String(rowValues[1] || '').trim();
    const candidateLokasi = String(rowValues[2] || '').trim();

    if (candidateKode === String(kodePelanggan || '').trim() &&
        candidateNama === String(namaPelanggan || '').trim() &&
        candidateLokasi === String(lokasi || '').trim()) {
      lastMatchingRow = candidateRow;
    }
  });

  return lastMatchingRow === Number(rowNumber);
}

function getKontrakGroupInsertRow_(sheet, kodePelanggan, namaPelanggan, lokasi) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.insertRowAfter(1);
    return 2;
  }

  const values = sheet.getRange(2, 5, lastRow - 1, 3).getValues();
  let lastMatchingRow = 0;

  values.forEach((rowValues, index) => {
    const rowNumber = index + 2;
    const candidateKode = String(rowValues[0] || '').trim();
    const candidateNama = String(rowValues[1] || '').trim();
    const candidateLokasi = String(rowValues[2] || '').trim();

    if (candidateKode === String(kodePelanggan || '').trim() &&
        candidateNama === String(namaPelanggan || '').trim() &&
        candidateLokasi === String(lokasi || '').trim()) {
      lastMatchingRow = rowNumber;
    }
  });

  if (lastMatchingRow) {
    sheet.insertRowAfter(lastMatchingRow);
    return lastMatchingRow + 1;
  }

  return getNextKontrakDataRow_(sheet);
}

function validatePerpanjanganKontrak_(sourceKontrak, normalizedData) {
  const sourceEndDate = sourceKontrak.periodeBerakhir ? new Date(sourceKontrak.periodeBerakhir) : null;
  if (!sourceEndDate || isNaN(sourceEndDate.getTime())) {
    throw new Error('Kontrak sumber belum memiliki Periode Berakhir yang valid.');
  }

  const newStartDate = new Date(normalizedData.periodeAwal);
  if (isNaN(newStartDate.getTime())) {
    throw new Error('Periode Awal perpanjangan tidak valid.');
  }

  sourceEndDate.setHours(0, 0, 0, 0);
  newStartDate.setHours(0, 0, 0, 0);

  if (newStartDate <= sourceEndDate) {
    throw new Error('Periode Awal perpanjangan harus setelah Periode Berakhir kontrak sebelumnya.');
  }
}

function validateUpgradeKontrak_(sourceKontrak, normalizedData) {
  const sourceStartDate = sourceKontrak.periodeAwal ? new Date(sourceKontrak.periodeAwal) : null;
  const sourceEndDate = sourceKontrak.periodeBerakhir ? new Date(sourceKontrak.periodeBerakhir) : null;
  const newStartDate = normalizedData.periodeAwal ? new Date(normalizedData.periodeAwal) : null;

  if (!sourceStartDate || isNaN(sourceStartDate.getTime()) || !sourceEndDate || isNaN(sourceEndDate.getTime())) {
    throw new Error('Periode kontrak sumber tidak valid untuk proses upgrade.');
  }

  if (!newStartDate || isNaN(newStartDate.getTime())) {
    throw new Error('Periode Awal upgrade tidak valid.');
  }

  sourceStartDate.setHours(0, 0, 0, 0);
  sourceEndDate.setHours(0, 0, 0, 0);
  newStartDate.setHours(0, 0, 0, 0);

  if (newStartDate <= sourceStartDate) {
    throw new Error('Periode Awal upgrade harus setelah Periode Awal kontrak lama.');
  }

  if (newStartDate > sourceEndDate) {
    throw new Error('Periode Awal upgrade harus masih berada di dalam periode kontrak lama yang berjalan.');
  }
}

function savePerpanjanganKontrak(formData) {
  const sourceRow = Number(formData && formData.sourceRowNumber);
  if (!sourceRow || sourceRow < 2) {
    throw new Error('Kontrak sumber perpanjangan tidak valid.');
  }

  validateKontrakFormData(formData);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const sourceKontrak = getKontrakPerpanjanganSourceByRow(sourceRow);
  const normalizedData = normalizeKontrakFormData(formData);
  validatePerpanjanganKontrak_(sourceKontrak, normalizedData);

  const periodeFolder = getOrCreateKontrakPeriodeFolder(
    normalizedData.lokasi,
    normalizedData.periodeAwal,
    normalizedData.periodeBerakhir
  );
  const uploadedFiles = uploadFilesToTargetFolder(periodeFolder, normalizedData.uploadItems);
  const latestContractFile = getLatestContractFile(uploadedFiles);

  const rowData = [
    getNextNumber(SHEET_KONTRAK_LENGKAP),
    generateContractId(),
    '',
    normalizedData.kategori,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi,
    '',
    normalizedData.periodeAwal,
    '',
    normalizedData.periodeBerakhir,
    normalizedData.noKontrak,
    normalizedData.core,
    normalizedData.sharingCore,
    normalizedData.nilaiKontrak,
    normalizedData.biayaAktivasi,
    normalizedData.perbulan,
    normalizedData.nilaiPeriodeAktif,
    normalizedData.statusKontrak,
    periodeFolder.getUrl(),
    'Lihat Billing',
    normalizedData.keterangan,
    sourceKontrak.idKontrak
  ];

  const newRow = getKontrakGroupInsertRow_(
    sheet,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi
  );

  setKontrakRowData_(sheet, newRow, rowData);
  sheet.getRange(sourceRow, KONTRAK_AKSI_COLUMN).clearContent();
  sheet.getRange(newRow, KONTRAK_AKSI_COLUMN).clearContent();
  ensureKontrakFormulaColumns_();
  reconcileKontrakStatusColumn_();

  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  sheet.setActiveRange(sheet.getRange(newRow, 1, 1, KONTRAK_LENGKAP_HEADERS.length));

  if (latestContractFile && normalizedData.noKontrak) {
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(normalizedData.noKontrak)
      .setLinkUrl(latestContractFile.url)
      .build();
    sheet.getRange(newRow, 12).setRichTextValue(richText);
  }

  return {
    success: true,
    message: 'Perpanjangan kontrak berhasil disimpan.',
    newRowNumber: newRow,
    previousContractId: sourceKontrak.idKontrak
  };
}

function saveUpgradeKontrak(formData) {
  const sourceRow = Number(formData && formData.sourceRowNumber);
  if (!sourceRow || sourceRow < 2) {
    throw new Error('Kontrak sumber upgrade tidak valid.');
  }

  validateKontrakFormData(formData);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const sourceKontrak = getKontrakUpgradeSourceByRow(sourceRow);
  const normalizedData = normalizeKontrakFormData(formData);
  validateUpgradeKontrak_(sourceKontrak, normalizedData);
  const sourceCurrentRichText = sheet.getRange(sourceRow, 12).getRichTextValue();
  const sourceExistingContractLink = sourceCurrentRichText ? sourceCurrentRichText.getLinkUrl() : '';

  const sourceStartDate = new Date(sourceKontrak.periodeAwal);
  const sourceNewEndDate = new Date(normalizedData.periodeAwal);
  sourceNewEndDate.setDate(sourceNewEndDate.getDate() - 1);
  const adjustedDuration = calculateDurationMonths(sourceStartDate, sourceNewEndDate);
  const adjustedNilaiKontrak = toNumber(sourceKontrak.perbulan) * adjustedDuration;

  const periodeFolder = getOrCreateKontrakPeriodeFolder(
    normalizedData.lokasi,
    normalizedData.periodeAwal,
    normalizedData.periodeBerakhir
  );
  const uploadedFiles = uploadFilesToTargetFolder(periodeFolder, normalizedData.uploadItems);
  const latestContractFile = getLatestContractFile(uploadedFiles);

  const rowData = [
    getNextNumber(SHEET_KONTRAK_LENGKAP),
    generateContractId(),
    '',
    normalizedData.kategori,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi,
    '',
    normalizedData.periodeAwal,
    '',
    normalizedData.periodeBerakhir,
    normalizedData.noKontrak,
    normalizedData.core,
    normalizedData.sharingCore,
    normalizedData.nilaiKontrak,
    normalizedData.biayaAktivasi,
    normalizedData.perbulan,
    normalizedData.nilaiPeriodeAktif,
    normalizedData.statusKontrak,
    periodeFolder.getUrl(),
    'Lihat Billing',
    normalizedData.keterangan,
    sourceKontrak.idKontrak
  ];

  const newRow = getKontrakGroupInsertRow_(
    sheet,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi
  );

  setKontrakRowData_(sheet, newRow, rowData);

  const sourceCurrentValues = sheet.getRange(sourceRow, 1, 1, KONTRAK_LENGKAP_HEADERS.length).getValues()[0];
  const sourceRowData = [
    sourceCurrentValues[0],
    sourceCurrentValues[1],
    '',
    sourceKontrak.kategori,
    sourceKontrak.kodePelanggan,
    sourceKontrak.namaPelanggan,
    sourceKontrak.lokasi,
    '',
    new Date(sourceKontrak.periodeAwal),
    '',
    sourceNewEndDate,
    sourceKontrak.noKontrak,
    sourceKontrak.core,
    sourceKontrak.sharingCore,
    adjustedNilaiKontrak,
    sourceKontrak.biayaAktivasi,
    sourceKontrak.perbulan,
    adjustedNilaiKontrak,
    'Di-upgrade',
    sourceKontrak.berkasFolderUrl,
    sourceCurrentValues[20],
    sourceKontrak.keterangan,
    sourceKontrak.previousIdKontrak
  ];
  setKontrakRowData_(sheet, sourceRow, sourceRowData);
  if (sourceKontrak.noKontrak && sourceExistingContractLink) {
    const sourceRichText = SpreadsheetApp.newRichTextValue()
      .setText(sourceKontrak.noKontrak)
      .setLinkUrl(sourceExistingContractLink)
      .build();
    sheet.getRange(sourceRow, 12).setRichTextValue(sourceRichText);
  }
  sheet.getRange(sourceRow, KONTRAK_AKSI_COLUMN).clearContent();
  sheet.getRange(newRow, KONTRAK_AKSI_COLUMN).clearContent();
  ensureKontrakFormulaColumns_();
  reconcileKontrakStatusColumn_();

  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  sheet.setActiveRange(sheet.getRange(newRow, 1, 1, KONTRAK_LENGKAP_HEADERS.length));

  if (latestContractFile && normalizedData.noKontrak) {
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(normalizedData.noKontrak)
      .setLinkUrl(latestContractFile.url)
      .build();
    sheet.getRange(newRow, 12).setRichTextValue(richText);
  }

  return {
    success: true,
    message: 'Upgrade kontrak berhasil disimpan.',
    newRowNumber: newRow,
    previousContractId: sourceKontrak.idKontrak
  };
}

function updateKontrakLokasi(formData) {
  const row = Number(formData && formData.rowNumber);
  if (!row || row < 2) {
    throw new Error('Baris kontrak tidak valid.');
  }

  validateKontrakFormData(formData);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) {
    throw new Error('Sheet Kontrak Lengkap tidak ditemukan.');
  }

  const normalizedData = normalizeKontrakFormData(formData);
  const currentValues = sheet.getRange(row, 1, 1, KONTRAK_LENGKAP_HEADERS.length).getValues()[0];
  const currentRichText = sheet.getRange(row, 12).getRichTextValue();
  const existingContractLink = currentRichText ? currentRichText.getLinkUrl() : '';
  const existingContractFileId = extractDriveFileIdFromUrl_(existingContractLink);
  const targetFolder = syncKontrakPeriodFolderForUpdate_(
    currentValues[19],
    normalizedData.lokasi,
    normalizedData.periodeAwal,
    normalizedData.periodeBerakhir
  );

  trashFilesByIds_(formData && formData.deleteFileIds);
  const uploadedFiles = uploadFilesToTargetFolder(targetFolder, normalizedData.uploadItems);
  const latestContractFile = getLatestContractFile(uploadedFiles);

  const rowData = [
    currentValues[0],
    currentValues[1],
    '',
    normalizedData.kategori,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    normalizedData.lokasi,
    '',
    normalizedData.periodeAwal,
    '',
    normalizedData.periodeBerakhir,
    normalizedData.noKontrak,
    normalizedData.core,
    normalizedData.sharingCore,
    normalizedData.nilaiKontrak,
    normalizedData.biayaAktivasi,
    normalizedData.perbulan,
    normalizedData.nilaiPeriodeAktif,
    normalizedData.statusKontrak,
    targetFolder.getUrl(),
    currentValues[20],
    normalizedData.keterangan,
    currentValues[22]
  ];

  setKontrakRowData_(sheet, row, rowData);
  sheet.getRange(row, KONTRAK_AKSI_COLUMN).clearContent();
  reconcileKontrakStatusColumn_();

  const kontrakCell = sheet.getRange(row, 12);
  const deletedFileIds = (formData && formData.deleteFileIds) || [];
  const isExistingContractFileDeleted = existingContractFileId && deletedFileIds.includes(existingContractFileId);
  const finalContractLink = latestContractFile
    ? latestContractFile.url
    : (isExistingContractFileDeleted ? '' : existingContractLink);
  if (normalizedData.noKontrak && finalContractLink) {
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(normalizedData.noKontrak)
      .setLinkUrl(finalContractLink)
      .build();
    kontrakCell.setRichTextValue(richText);
  } else {
    kontrakCell.setValue(normalizedData.noKontrak);
  }

  return {
    success: true,
    message: 'Kontrak lokasi berhasil diperbarui.'
  };
}

function calculateDurationMonths(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const monthDiff = ((end.getFullYear() - start.getFullYear()) * 12) +
    (end.getMonth() - start.getMonth());

  return monthDiff + (end.getDate() >= start.getDate() ? 1 : 0);
}

function generateContractId() {
  return `CTR-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;

  const normalized = String(value).replace(/[^\d.-]/g, '');
  return Number(normalized) || 0;
}

function extractNumber(value) {
  if (value === null || value === undefined || value === '') return '';

  const normalized = String(value).replace(/[^\d.-]/g, '');
  return normalized ? Number(normalized) || '' : '';
}

function formatDateForInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDate(firstDate, secondDate) {
  if (!firstDate || !secondDate) return false;

  const first = new Date(firstDate);
  const second = new Date(secondDate);
  if (isNaN(first.getTime()) || isNaN(second.getTime())) return false;

  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
}

function calculateEndDate(startDate, durationMonths) {
  if (!startDate || !durationMonths) return '';

  const start = new Date(startDate);
  const months = Number(durationMonths);

  if (isNaN(start.getTime()) || isNaN(months) || months <= 0) return '';

  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);

  return end;
}

function calculateKontrakLifecycleStatus_(startDate, endDate) {
  if (!startDate || !endDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (today < start) return 'Belum Beroperasi';
  if (today >= start && today <= end) return 'Aktif';
  return 'Berakhir';
}

function reconcileKontrakStatusColumn_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KONTRAK_LENGKAP);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, KONTRAK_LENGKAP_HEADERS.length).getValues();
  const childMap = {};

  values.forEach((rowValues, index) => {
    const previousId = String(rowValues[22] || '').trim();
    if (!previousId) return;

    if (!childMap[previousId]) {
      childMap[previousId] = [];
    }

    childMap[previousId].push({
      rowNumber: index + 2,
      startDate: rowValues[8],
      currentStatus: String(rowValues[18] || '').trim()
    });
  });

  const nextStatuses = values.map(rowValues => {
    const currentStatus = String(rowValues[18] || '').trim();
    const normalizedStatus = currentStatus.toLowerCase();

    if (normalizedStatus === 'nonaktif' || normalizedStatus === 'di-upgrade') {
      return [currentStatus];
    }

    const idKontrak = String(rowValues[1] || '').trim();
    const childContracts = idKontrak ? (childMap[idKontrak] || []) : [];
    if (childContracts.length) {
      const earliestChild = childContracts
        .slice()
        .sort((first, second) => new Date(first.startDate).getTime() - new Date(second.startDate).getTime())[0];

      const childStatus = calculateKontrakLifecycleStatus_(earliestChild.startDate, earliestChild.startDate);
      if (childStatus === 'Belum Beroperasi') {
        const baseStatus = calculateKontrakLifecycleStatus_(rowValues[8], rowValues[10]);
        return [baseStatus === 'Berakhir' ? 'Diperpanjang' : 'Aktif'];
      }

      return ['Diperpanjang'];
    }

    return [calculateKontrakLifecycleStatus_(rowValues[8], rowValues[10])];
  });

  sheet.getRange(2, 19, nextStatuses.length, 1).setValues(nextStatuses);
}

function calculateStatus(startDate, endDate) {
  if (!startDate || !endDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (today < start) return 'Aktif';
  if (today >= start && today <= end) return 'Aktif';
  if (today > end) return 'Berakhir';

  return '';
}

function calculateSisaWaktu(endDate) {
  if (!endDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Sudah berakhir';
  if (diffDays === 0) return 'Berakhir hari ini';

  const remainingMonths = getRemainingFullMonths(today, end);
  if (remainingMonths >= 1) {
    return `${remainingMonths} bulan lagi`;
  }

  return `${diffDays} hari lagi`;
}

function getRemainingFullMonths(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let months = ((end.getFullYear() - start.getFullYear()) * 12) +
    (end.getMonth() - start.getMonth());

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function getNextNumber(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return 1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(String);
  if (values.length === 0) return 1;

  return Math.max(...values.map(Number)) + 1;
}

function buildPelangganFolderName(companyCode, companyName) {
  const code = companyCode ? String(companyCode).trim() : '';
  const name = companyName ? String(companyName).trim() : '';

  if (code && name) return `${code} - ${name}`;
  return name;
}

function savePelanggan(formData) {
  const sheet = getPelangganSheet_();
  if (!sheet) throw new Error('Sheet pelanggan tidak ditemukan.');

  const normalizedData = validatePelangganFormData_(formData);

  const nextNo = getNextNumber(sheet.getName());
  const pelangganFolder = getOrCreatePelangganFolder(
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan
  );

  uploadFilesToTargetFolder(pelangganFolder, normalizedData.uploadItems || []);

  const rowData = [
    nextNo,
    normalizedData.kodePelanggan,
    normalizedData.namaPelanggan,
    '', // Kontrak Aktif (ditambahkan manual)
    normalizedData.pic,
    normalizedData.telepon,
    normalizedData.email,
    pelangganFolder.getUrl(),
    normalizedData.keterangan,
    ''    
  ];

  const insertRow = getPelangganInsertRow_(sheet);
  sheet.getRange(insertRow, 1, 1, rowData.length).setValues([rowData]);

  const pelangganRecord = buildPelangganRecord_(rowData, insertRow);

  return {
    success: true,
    message: 'Data pelanggan berhasil disimpan.',
    customerRecordId: pelangganRecord ? pelangganRecord.id : ''
  };
}

function savePerusahaan(formData) {
  return savePelanggan(formData);
}

function syncPelangganFolderForUpdate_(currentFolderUrl, companyCode, companyName) {
  const targetName = buildPelangganFolderName(companyCode, companyName) || companyName;
  if (!targetName) {
    throw createApiError_('invalid_company_folder', 'Nama folder pelanggan tidak valid.', 400);
  }

  const currentFolder = getFolderByUrl_(currentFolderUrl);
  if (!currentFolder) {
    return getOrCreatePelangganFolder(companyCode, companyName);
  }

  currentFolder.setName(targetName);
  getOrCreateSubFolder(currentFolder, 'Kontrak');
  getOrCreateSubFolder(currentFolder, 'BAK-PKS');
  getOrCreateSubFolder(currentFolder, 'Dokumen Lain');

  return currentFolder;
}

function getPelangganRootFolder() {
  return DriveApp.getFolderById(PELANGGAN_ROOT_FOLDER_ID);
}

function getPelangganInsertRow_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 2;

  const values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]).trim() !== '') {
      return i + 2;
    }
  }
  return 2;
}

function getLokasiRootFolder() {
  if (!String(LOKASI_ROOT_FOLDER_ID || '').trim()) {
    throw new Error('LOKASI_ROOT_FOLDER_ID belum diisi. Atur folder root khusus lokasi terlebih dahulu.');
  }

  return DriveApp.getFolderById(LOKASI_ROOT_FOLDER_ID);
}

function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function getOrCreatePelangganFolder(companyCode, companyName) {
  const root = getPelangganRootFolder();
  const folderName = buildPelangganFolderName(companyCode, companyName) || companyName;

  const folders = root.getFoldersByName(folderName);
  const pelangganFolder = folders.hasNext() ? folders.next() : root.createFolder(folderName);

  getOrCreateSubFolder(pelangganFolder, 'Kontrak');
  getOrCreateSubFolder(pelangganFolder, 'BAK-PKS');
  getOrCreateSubFolder(pelangganFolder, 'Dokumen Lain');

  return pelangganFolder;
}

function getOrCreateLokasiFolder(lokasi) {
  const folderName = String(lokasi || '').trim();
  if (!folderName) {
    throw new Error('Nama lokasi tidak valid untuk pembuatan folder.');
  }

  const root = getLokasiRootFolder();
  const folders = root.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : root.createFolder(folderName);
}

function getOrCreateKontrakPeriodeFolder(lokasi, periodeAwal, periodeBerakhir) {
  const lokasiFolder = getOrCreateLokasiFolder(lokasi);
  const periodFolderName = buildKontrakPeriodeFolderName_(periodeAwal, periodeBerakhir);
  const periodFolders = lokasiFolder.getFoldersByName(periodFolderName);
  const periodFolder = periodFolders.hasNext()
    ? periodFolders.next()
    : lokasiFolder.createFolder(periodFolderName);

  getOrCreateSubFolder(periodFolder, 'Kontrak');
  getOrCreateSubFolder(periodFolder, 'BAK-PKS');
  getOrCreateSubFolder(periodFolder, 'Dokumen Lain');

  return periodFolder;
}

function buildKontrakPeriodeFolderName_(periodeAwal, periodeBerakhir) {
  const start = formatDateForFolderName_(periodeAwal);
  const end = formatDateForFolderName_(periodeBerakhir);

  if (!start || !end) {
    throw new Error('Periode kontrak tidak valid untuk pembuatan folder.');
  }

  return `${start} s.d. ${end}`;
}

function formatDateForFolderName_(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getTargetSubFolder(parentFolder, jenisBerkas) {
  if (jenisBerkas === 'Kontrak') {
    return getOrCreateSubFolder(parentFolder, 'Kontrak');
  }

  if (jenisBerkas === 'BAK-PKS') {
    return getOrCreateSubFolder(parentFolder, 'BAK-PKS');
  }

  return getOrCreateSubFolder(parentFolder, 'Dokumen Lain');
}

function base64ToBlob(base64, mimeType, fileName) {
  const bytes = Utilities.base64Decode(base64);
  return Utilities.newBlob(bytes, mimeType, fileName);
}

function uploadFilesToTargetFolder(parentFolder, uploadItems) {
  if (!uploadItems || !uploadItems.length) return [];

  const uploadedFiles = [];

  uploadItems.forEach(item => {
    if (!item.base64Data) return;

    const targetFolder = getTargetSubFolder(parentFolder, item.jenisBerkas);
    const extension = item.originalFileName && item.originalFileName.includes('.')
      ? item.originalFileName.substring(item.originalFileName.lastIndexOf('.'))
      : '';

    const finalName = item.namaFile + extension;
    const blob = base64ToBlob(item.base64Data, item.mimeType, finalName);
    const file = targetFolder.createFile(blob).setName(finalName);

    uploadedFiles.push({
      jenisBerkas: item.jenisBerkas,
      namaFile: finalName,
      url: file.getUrl(),
      fileId: file.getId()
    });
  });

  return uploadedFiles;
}

function getLatestContractFile(uploadedFiles) {
  if (!uploadedFiles || !uploadedFiles.length) return null;

  const kontrakFiles = uploadedFiles.filter(file => file.jenisBerkas === 'Kontrak');
  if (!kontrakFiles.length) return null;

  return kontrakFiles[kontrakFiles.length - 1];
}

function syncKontrakPeriodFolderForUpdate_(currentFolderUrl, lokasi, periodeAwal, periodeBerakhir) {
  const targetFolder = getOrCreateKontrakPeriodeFolder(lokasi, periodeAwal, periodeBerakhir);
  const currentFolder = getFolderByUrl_(currentFolderUrl);

  if (!currentFolder || currentFolder.getId() === targetFolder.getId()) {
    return targetFolder;
  }

  if (isFolderAncestorOf_(currentFolder, targetFolder)) {
    migrateLegacyLokasiFolderContentsToPeriodFolder_(currentFolder, targetFolder);
    cleanupEmptyLegacySubfolders_(currentFolder);
    return targetFolder;
  }

  mergeFolderContents_(currentFolder, targetFolder);
  const lokasiFolder = getParentFolder_(currentFolder);
  trashFolderRecursively_(currentFolder);
  cleanupEmptyLokasiFolder_(lokasiFolder);

  return targetFolder;
}

function listKontrakFilesByFolderUrl_(folderUrl) {
  const folder = getFolderByUrl_(folderUrl);
  if (!folder) return [];

  return listFolderFilesRecursively_(folder, '');
}

function listPelangganFilesByFolderUrl_(folderUrl) {
  const folder = getFolderByUrl_(folderUrl);
  if (!folder) return [];

  return listFolderFilesRecursively_(folder, '');
}

function listFolderFilesRecursively_(folder, jenisBerkas) {
  const files = [];
  const folderFiles = folder.getFiles();
  while (folderFiles.hasNext()) {
    const file = folderFiles.next();
    files.push({
      fileId: file.getId(),
      namaFile: file.getName(),
      url: file.getUrl(),
      jenisBerkas: jenisBerkas || 'Dokumen'
    });
  }

  const childFolders = folder.getFolders();
  while (childFolders.hasNext()) {
    const childFolder = childFolders.next();
    files.push(...listFolderFilesRecursively_(childFolder, childFolder.getName()));
  }

  return files;
}

function trashFilesByIds_(fileIds) {
  if (!fileIds || !fileIds.length) return;

  fileIds.forEach(fileId => {
    const normalizedId = String(fileId || '').trim();
    if (!normalizedId) return;

    DriveApp.getFileById(normalizedId).setTrashed(true);
  });
}

function getFolderByUrl_(folderUrl) {
  const folderId = extractDriveIdFromUrl_(folderUrl);
  if (!folderId) return null;

  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    return null;
  }
}

function isFolderAncestorOf_(ancestorFolder, candidateDescendantFolder) {
  if (!ancestorFolder || !candidateDescendantFolder) return false;
  if (ancestorFolder.getId() === candidateDescendantFolder.getId()) return false;

  let currentParent = getParentFolder_(candidateDescendantFolder);
  while (currentParent) {
    if (currentParent.getId() === ancestorFolder.getId()) {
      return true;
    }

    currentParent = getParentFolder_(currentParent);
  }

  return false;
}

function migrateLegacyLokasiFolderContentsToPeriodFolder_(lokasiFolder, targetFolder) {
  const legacyFiles = lokasiFolder.getFiles();
  while (legacyFiles.hasNext()) {
    legacyFiles.next().moveTo(targetFolder);
  }

  const legacyBucketNames = ['Kontrak', 'BAK-PKS', 'Dokumen Lain'];
  legacyBucketNames.forEach(folderName => {
    const bucketIterator = lokasiFolder.getFoldersByName(folderName);
    while (bucketIterator.hasNext()) {
      const sourceBucket = bucketIterator.next();
      const targetBucket = getOrCreateSubFolder(targetFolder, folderName);
      mergeFolderContents_(sourceBucket, targetBucket);

      if (!sourceBucket.getFiles().hasNext() && !sourceBucket.getFolders().hasNext()) {
        sourceBucket.setTrashed(true);
      }
    }
  });
}

function cleanupEmptyLegacySubfolders_(folder) {
  if (!folder) return;

  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const childFolder = folders.next();
    const childName = childFolder.getName();
    if (childName !== 'Kontrak' && childName !== 'BAK-PKS' && childName !== 'Dokumen Lain') {
      continue;
    }

    if (!childFolder.getFiles().hasNext() && !childFolder.getFolders().hasNext()) {
      childFolder.setTrashed(true);
    }
  }
}

function mergeFolderContents_(sourceFolder, targetFolder) {
  const sourceFiles = sourceFolder.getFiles();
  while (sourceFiles.hasNext()) {
    sourceFiles.next().moveTo(targetFolder);
  }

  const sourceFolders = sourceFolder.getFolders();
  while (sourceFolders.hasNext()) {
    const sourceChildFolder = sourceFolders.next();
    const targetChildFolder = getOrCreateSubFolder(targetFolder, sourceChildFolder.getName());
    mergeFolderContents_(sourceChildFolder, targetChildFolder);

    if (!sourceChildFolder.getFiles().hasNext() && !sourceChildFolder.getFolders().hasNext()) {
      sourceChildFolder.setTrashed(true);
    }
  }
}

function installKontrakAksiTrigger_() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'handleKontrakSheetEdit_' &&
        trigger.getTriggerSourceId() === spreadsheetId) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('handleKontrakSheetEdit_')
    .forSpreadsheet(spreadsheetId)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    'Trigger Aktif',
    'Trigger aksi kontrak berhasil diaktifkan. Sekarang dropdown Edit/Perpanjang/Di-upgrade/Hapus bisa menjalankan modal dan aksi hapus.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function handleKontrakSheetEdit_(e) {
  const sheet = e.range.getSheet();

  if (sheet.getName() === SHEET_KONTRAK_LENGKAP) {
    handleKontrakLengkapEditTrigger_(e);
    return;
  }

  if (isPelangganSheet_(sheet)) {
    handlePelangganActionTrigger_(e);
  }
}

function handleKontrakLengkapEditTrigger_(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row === 1) return;
  if (col !== KONTRAK_AKSI_COLUMN) return;

  const action = String(e.range.getValue() || '').trim();
  const normalizedAction = action.toLowerCase();
  if (!normalizedAction) return;

  try {
    if (normalizedAction === 'edit') {
      const html = HtmlService.createTemplateFromFile('EditKontrakLokasi');
      html.rowNumber = row;
      const output = html.evaluate().setWidth(860).setHeight(720);
      SpreadsheetApp.getUi().showModalDialog(output, 'Edit Kontrak Lokasi');
      return;
    }

    if (normalizedAction === 'perpanjang') {
      showPerpanjanganKontrakForm_(row);
      return;
    }

    if (normalizedAction === 'di-upgrade') {
      showUpgradeKontrakLokasiForm_(row);
      return;
    }

    if (normalizedAction === 'hapus') {
      handleKontrakDeleteTrigger_(sheet, row, e.range);
    }
  } finally {
    if (sheet.getLastRow() >= row) {
      e.range.setValue('');
    }
  }
}

function handleKontrakDeleteTrigger_(sheet, row, actionRange) {
  const ui = SpreadsheetApp.getUi();
  const idKontrak = sheet.getRange(row, 2).getValue();
  const namaPelanggan = sheet.getRange(row, 5).getValue();
  const lokasi = sheet.getRange(row, 6).getValue();

  const response = ui.alert(
    'Konfirmasi Hapus',
    `Yakin ingin menghapus kontrak ini beserta berkas Drive terkait?\n\nID: ${idKontrak}\nPelanggan: ${namaPelanggan}\nLokasi: ${lokasi}`,
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    const driveCleanup = deleteKontrakDriveAssetsForRow_(sheet, row);
    sheet.deleteRow(row);

    if (driveCleanup.skippedSharedFolder) {
      ui.alert(
        'Folder Drive Tidak Dihapus',
        'Baris kontrak sudah dihapus, tetapi folder Drive tidak dihapus karena masih dipakai kontrak lain pada lokasi/folder yang sama.',
        ui.ButtonSet.OK
      );
    }

    return;
  }

  actionRange.setValue('');
}

function deleteKontrakDriveAssetsForRow_(sheet, row) {
  const folderUrl = String(sheet.getRange(row, 20).getValue() || '').trim();
  if (!folderUrl) {
    return {
      deletedFolder: false,
      skippedSharedFolder: false
    };
  }

  if (isKontrakFolderReferencedElsewhere_(sheet, row, folderUrl)) {
    return {
      deletedFolder: false,
      skippedSharedFolder: true
    };
  }

  const folderId = extractDriveIdFromUrl_(folderUrl);
  if (!folderId) {
    throw new Error('Link folder Drive pada kontrak ini tidak valid.');
  }

  const folder = DriveApp.getFolderById(folderId);
  const lokasiFolder = getParentFolder_(folder);
  trashFolderRecursively_(folder);
  cleanupEmptyLokasiFolder_(lokasiFolder);

  return {
    deletedFolder: true,
    skippedSharedFolder: false
  };
}

function isKontrakFolderReferencedElsewhere_(sheet, currentRow, folderUrl) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 20, lastRow - 1, 1).getValues();
  const normalizedFolderUrl = String(folderUrl).trim();

  for (let index = 0; index < values.length; index += 1) {
    const rowNumber = index + 2;
    if (rowNumber === currentRow) continue;

    const candidateUrl = String(values[index][0] || '').trim();
    if (candidateUrl && candidateUrl === normalizedFolderUrl) {
      return true;
    }
  }

  return false;
}

function extractDriveIdFromUrl_(url) {
  const folderMatch = String(url).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  const idMatch = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch && idMatch[1] ? idMatch[1] : '';
}

function extractDriveFileIdFromUrl_(url) {
  const fileMatch = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  const idMatch = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch && idMatch[1] ? idMatch[1] : '';
}

function getParentFolder_(folder) {
  const parents = folder.getParents();
  return parents.hasNext() ? parents.next() : null;
}

function cleanupEmptyLokasiFolder_(folder) {
  if (!folder) return;

  const lokasiRoot = getLokasiRootFolder();
  if (folder.getId() === lokasiRoot.getId()) return;

  if (folder.getFiles().hasNext()) return;
  if (folder.getFolders().hasNext()) return;

  folder.setTrashed(true);
}

function trashFolderRecursively_(folder) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }

  const childFolders = folder.getFolders();
  while (childFolders.hasNext()) {
    const childFolder = childFolders.next();
    trashFolderRecursively_(childFolder);
  }

  folder.setTrashed(true);
}

function findHeaderColumnIndex_(sheet, headerName) {
  if (!sheet || !headerName) return 0;

  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return 0;

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalizedHeader = String(headerName).trim().toLowerCase();

  for (let index = 0; index < headers.length; index += 1) {
    if (String(headers[index] || '').trim().toLowerCase() === normalizedHeader) {
      return index + 1;
    }
  }

  return 0;
}

function handlePelangganActionTrigger_(e) {
  const sheet = e.range.getSheet();
  if (!isPelangganSheet_(sheet)) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row === 1) return;
  const aksiColumn = findHeaderColumnIndex_(sheet, 'Aksi');
  if (!aksiColumn || col !== aksiColumn) return;

  const value = String(e.range.getValue() || '').trim();
  const normalizedValue = value.toLowerCase();
  if (!normalizedValue) return;

  try {
    if (normalizedValue === 'edit') {
      showEditPelangganForm_(row);
      return;
    }

    if (normalizedValue === 'hapus') {
      const ui = SpreadsheetApp.getUi();
      const namaPelanggan = sheet.getRange(row, 3).getValue();

      const response = ui.alert(
        'Konfirmasi Hapus',
        `Yakin ingin menghapus data pelanggan "${namaPelanggan}" pada baris ini?`,
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        sheet.deleteRow(row);
        return;
      }
    }
  } finally {
    if (sheet.getLastRow() >= row) {
      e.range.setValue('');
    }
  }
}
