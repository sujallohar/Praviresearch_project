import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Download, CheckCircle2, 
  AlertTriangle, X, Loader2, Building2, Plus 
} from 'lucide-react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { downloadCsv } from '../../utils/fileDownloader';

interface ParsedAssetRow {
  name: string;
  type: string;
  departmentId: string;
  location: string;
  condition: string;
  riskLevel: string;
  status: string;
  latitude: number;
  longitude: number;
  estimatedValue: number;
  description: string;
  isValid: boolean;
  error?: string;
}

interface BulkCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedAssetRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const headers = "Name,Category,Department,Location,Condition,Risk Level,Status,Latitude,Longitude,Estimated Value,Description\n";
    const sampleRows = [
      '"South Expressway Flyover","Infrastructure","dept-transport","South Ward Zone A","Good","Medium","Operational","23.0180","72.5690","1850000","Reinforced concrete four-lane overpass constructed in 2021."',
      '"North Water Reservoir & Pumping Station","Facility","dept-utilities","North Sector 8","Fair","Low","Operational","23.0420","72.5830","720000","Primary municipal drinking water balancing reservoir."'
    ].join('\n');
    downloadCsv(headers + sampleRows, 'GovAsset_Import_Template.csv');
  };

  const parseCsvText = (text: string) => {
    try {
      setErrorMsg(null);
      setSuccessCount(null);
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        setErrorMsg('The CSV file appears empty or missing a header row.');
        setParsedRows([]);
        return;
      }

      // Robust delimiter parser (auto-detects comma, tab, or semicolon from Excel/Sheets)
      const splitCsvLine = (line: string): string[] => {
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') && !line.includes(',') ? ';' : ',');
        const result: string[] = [];
        let insideQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === delimiter && !insideQuotes) {
            result.push(currentValue.trim().replace(/^"|"$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        result.push(currentValue.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const rows: ParsedAssetRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]);
        if (cols.length < 2 || !cols[0]) continue;

        const name = cols[0] || 'Unnamed Asset';
        const type = cols[1] || 'Infrastructure';
        const departmentId = cols[2] || 'Public Works';
        const location = cols[3] || 'Municipal Area';
        const condition = cols[4] || 'Good';
        const riskLevel = cols[5] || 'Medium';
        const status = cols[6] || 'Operational';
        const lat = parseFloat(cols[7]) || 23.0225;
        const lng = parseFloat(cols[8]) || 72.5714;
        const estimatedValue = parseFloat(cols[9]) || 500000;
        const description = cols[10] || 'Imported municipal infrastructure record.';

        rows.push({
          name,
          type,
          departmentId,
          location,
          condition,
          riskLevel,
          status,
          latitude: lat,
          longitude: lng,
          estimatedValue,
          description,
          isValid: Boolean(name && type)
        });
      }

      if (rows.length === 0) {
        setErrorMsg('No valid asset rows found in the uploaded file.');
      }

      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg('Failed to parse CSV file: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportToFirebase = async () => {
    if (parsedRows.length === 0) return;

    try {
      setImporting(true);
      setErrorMsg(null);

      // Firestore batches support up to 500 operations per batch
      const batch = writeBatch(db);

      for (const row of parsedRows) {
        const newRef = doc(collection(db, 'assets'));
        batch.set(newRef, {
          name: row.name,
          type: row.type,
          departmentId: row.departmentId,
          location: row.location,
          condition: row.condition,
          riskLevel: row.riskLevel,
          status: row.status,
          latitude: row.latitude,
          longitude: row.longitude,
          estimatedValue: row.estimatedValue,
          description: row.description,
          owner: 'Government Authority Import',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      setSuccessCount(parsedRows.length);
      onSuccess();

      setTimeout(() => {
        onClose();
        setParsedRows([]);
        setFileName('');
        setSuccessCount(null);
      }, 2000);
    } catch (err: any) {
      console.error('Batch import failed:', err);
      setErrorMsg('Database import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Real Assets via CSV / Excel</h3>
              <p className="text-xs text-slate-400">Bulk upload official municipal records directly into Cloud Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Successfully imported {successCount} real assets!</span>
                <p className="text-xs text-emerald-700 mt-0.5">Records are now live and persistent in Cloud Firestore.</p>
              </div>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-xs text-slate-900 block">Need the standard spreadsheet format?</span>
                <span className="text-[11px] text-slate-500">Includes columns for Name, Category, Department, GPS, and Valuation.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.tsv,text/tab-separated-values,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-800">
              {fileName ? fileName : 'Click to select CSV file from your computer'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .csv exported from Microsoft Excel, Google Sheets, or Apple Numbers
            </p>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Previewing {parsedRows.length} Assets Ready for Import
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {parsedRows.filter(r => r.isValid).length} Valid Rows
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Asset Name</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Condition</th>
                      <th className="py-2 px-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[160px]">{row.name}</td>
                        <td className="py-2 px-3 text-slate-600">{row.type}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">{row.location}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {row.condition}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">${row.estimatedValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl hover:bg-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImportToFirebase}
            disabled={importing || parsedRows.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing to Database...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Import {parsedRows.length} Assets to Firestore</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
