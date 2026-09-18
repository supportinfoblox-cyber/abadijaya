'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveOrShareFile } from '@/services/exportExcel';

export interface DeviceItem {
  id: string;
  hostname: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  ipManagement?: string;
  siteLocation: string;
  role: string;
  licenseType: string;
  licenseActiveDate: string; // YYYY-MM-DD
  licenseExpiredDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'STANDBY' | 'MAINTENANCE';
  notes?: string;
  lastUpdated: string;
}

const INITIAL_DEVICES: DeviceItem[] = [
  {
    id: 'DEV-001',
    hostname: 'BSI-IBX-GM01',
    model: 'Infoblox TE-2215',
    serialNumber: 'IBX-2215-99821A',
    ipAddress: '10.0.96.53',
    ipManagement: '10.0.96.153',
    siteLocation: 'BSI Kantor Pusat (Wisma Atlet)',
    role: 'Grid Master',
    licenseType: 'NIOS Grid + DNSone + Threat Insight',
    licenseActiveDate: '2025-01-01',
    licenseExpiredDate: '2027-01-01',
    status: 'ACTIVE',
    notes: 'Primary Grid Master untuk seluruh cluster BSI',
    lastUpdated: '2026-09-18 10:00',
  },
  {
    id: 'DEV-002',
    hostname: 'BSI-IBX-GMC01',
    model: 'Infoblox TE-2215',
    serialNumber: 'IBX-2215-99822B',
    ipAddress: '10.0.96.54',
    ipManagement: '10.0.96.154',
    siteLocation: 'BSI Menara Thamrin',
    role: 'Grid Master Candidate',
    licenseType: 'NIOS Grid + DNSone + Threat Insight',
    licenseActiveDate: '2025-01-01',
    licenseExpiredDate: '2027-01-01',
    status: 'ACTIVE',
    notes: 'Secondary GMC Failover cluster',
    lastUpdated: '2026-09-18 10:00',
  },
  {
    id: 'DEV-003',
    hostname: 'BSI-IBX-MBR-SBY01',
    model: 'Infoblox TE-1415',
    serialNumber: 'IBX-1415-44210C',
    ipAddress: '10.10.12.11',
    ipManagement: '10.10.12.21',
    siteLocation: 'Data Center Surabaya (DCS)',
    role: 'Member DNS/DHCP',
    licenseType: 'DNSone + Network Insight',
    licenseActiveDate: '2025-06-01',
    licenseExpiredDate: '2026-10-15', // Segera Expired (< 30 hari)
    status: 'ACTIVE',
    notes: 'Perlu pengajuan perpanjangan lisensi triwulan depan',
    lastUpdated: '2026-09-17 11:30',
  },
  {
    id: 'DEV-004',
    hostname: 'BSI-IBX-MBR-BDG01',
    model: 'Infoblox TE-1415',
    serialNumber: 'IBX-1415-44211D',
    ipAddress: '10.20.14.15',
    ipManagement: '10.20.14.25',
    siteLocation: 'Disaster Recovery Center Bandung (DRC)',
    role: 'Member DNS',
    licenseType: 'DNSone Enterprise',
    licenseActiveDate: '2025-03-15',
    licenseExpiredDate: '2026-11-20', // Segera Expired (< 90 hari)
    status: 'ACTIVE',
    notes: 'DRC Node replication cluster standby',
    lastUpdated: '2026-09-15 09:15',
  },
  {
    id: 'DEV-005',
    hostname: 'BSI-IBX-EXT-DNS01',
    model: 'Infoblox PT-4000',
    serialNumber: 'IBX-4000-77192E',
    ipAddress: '10.216.249.122',
    ipManagement: '10.216.249.222',
    siteLocation: 'BSI Gedung Landmark',
    role: 'External DNS',
    licenseType: 'Advanced DNS Protection (ADP)',
    licenseActiveDate: '2024-08-01',
    licenseExpiredDate: '2026-08-01', // Sudah Expired
    status: 'MAINTENANCE',
    notes: 'Lisensi ADP sedang dalam proses PO perpanjangan',
    lastUpdated: '2026-09-10 16:40',
  },
  {
    id: 'DEV-006',
    hostname: 'BSI-IBX-MBR-MDN01',
    model: 'Infoblox TE-815',
    serialNumber: 'IBX-815-11029F',
    ipAddress: '10.30.5.10',
    ipManagement: '10.30.5.20',
    siteLocation: 'BSI Regional Medan (KC Thamrin)',
    role: 'Member DNS/DHCP',
    licenseType: 'DNSone Branch Edition',
    licenseActiveDate: '2025-05-10',
    licenseExpiredDate: '2027-05-10',
    status: 'ACTIVE',
    notes: 'Local DNS caching & DHCP relay branch',
    lastUpdated: '2026-09-12 14:20',
  },
];

const LOCAL_STORAGE_KEY = 'ticketops_manage_services_devices';

export default function ManageServicesDevicesView() {
  const [devices, setDevices] = useState<DeviceItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved devices', e);
        }
      }
    }
    return INITIAL_DEVICES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLicenseStatus, setFilterLicenseStatus] = useState<string>('ALL');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form Fields
  const [formHostname, setFormHostname] = useState('');
  const [formModel, setFormModel] = useState('Infoblox TE-1415');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formIpAddress, setFormIpAddress] = useState('');
  const [formIpManagement, setFormIpManagement] = useState('');
  const [formSiteLocation, setFormSiteLocation] = useState('');
  const [formRole, setFormRole] = useState('Member DNS/DHCP');
  const [formLicenseType, setFormLicenseType] = useState('DNSone + Network Insight');
  const [formLicenseActiveDate, setFormLicenseActiveDate] = useState('');
  const [formLicenseExpiredDate, setFormLicenseExpiredDate] = useState('');
  const [formStatus, setFormStatus] = useState<DeviceItem['status']>('ACTIVE');
  const [formNotes, setFormNotes] = useState('');

  // Upload Preview State
  const [uploadedPreview, setUploadedPreview] = useState<DeviceItem[]>([]);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [uploadFileName, setUploadFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(devices));
    }
  }, [devices]);

  // Helper: License Status & Days Remaining
  const getLicenseInfo = (expiredDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiredDateStr);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'EXPIRED',
        days: Math.abs(diffDays),
        label: `Expired (${Math.abs(diffDays)} hari lalu)`,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
      };
    } else if (diffDays <= 30) {
      return {
        status: 'CRITICAL',
        days: diffDays,
        label: `Kritis (${diffDays} hari lagi)`,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.15)',
        borderColor: 'rgba(249, 115, 22, 0.3)',
      };
    } else if (diffDays <= 90) {
      return {
        status: 'WARNING',
        days: diffDays,
        label: `Segera Expired (${diffDays} hari lagi)`,
        color: '#eab308',
        bgColor: 'rgba(234, 179, 8, 0.15)',
        borderColor: 'rgba(234, 179, 8, 0.3)',
      };
    } else {
      return {
        status: 'ACTIVE',
        days: diffDays,
        label: `Aktif (${diffDays} hari lagi)`,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
      };
    }
  };

  // KPI Calculations
  const totalDevices = devices.length;
  const activeLicenses = devices.filter(d => getLicenseInfo(d.licenseExpiredDate).status === 'ACTIVE').length;
  const warningLicenses = devices.filter(d => getLicenseInfo(d.licenseExpiredDate).status === 'WARNING').length;
  const criticalLicenses = devices.filter(d => getLicenseInfo(d.licenseExpiredDate).status === 'CRITICAL').length;
  const expiredLicenses = devices.filter(d => getLicenseInfo(d.licenseExpiredDate).status === 'EXPIRED').length;

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.hostname.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) ||
      d.ipAddress.toLowerCase().includes(q) ||
      (d.ipManagement && d.ipManagement.toLowerCase().includes(q)) ||
      d.siteLocation.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      d.role.toLowerCase().includes(q);

    const licInfo = getLicenseInfo(d.licenseExpiredDate);
    const matchesLicense = filterLicenseStatus === 'ALL' || licInfo.status === filterLicenseStatus;

    return matchesSearch && matchesLicense;
  });

  // Open Create Form Modal
  const handleOpenCreate = () => {
    setEditingDevice(null);
    setFormHostname('');
    setFormModel('Infoblox TE-1415');
    setFormSerialNumber('');
    setFormIpAddress('');
    setFormIpManagement('');
    setFormSiteLocation('');
    setFormRole('Member DNS/DHCP');
    setFormLicenseType('DNSone + Network Insight');
    setFormLicenseActiveDate(new Date().toISOString().split('T')[0]);
    // Default 1 year expiry
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFormLicenseExpiredDate(nextYear.toISOString().split('T')[0]);
    setFormStatus('ACTIVE');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEdit = (dev: DeviceItem) => {
    setEditingDevice(dev);
    setFormHostname(dev.hostname);
    setFormModel(dev.model);
    setFormSerialNumber(dev.serialNumber);
    setFormIpAddress(dev.ipAddress);
    setFormIpManagement(dev.ipManagement || '');
    setFormSiteLocation(dev.siteLocation);
    setFormRole(dev.role);
    setFormLicenseType(dev.licenseType);
    setFormLicenseActiveDate(dev.licenseActiveDate);
    setFormLicenseExpiredDate(dev.licenseExpiredDate);
    setFormStatus(dev.status);
    setFormNotes(dev.notes || '');
    setIsFormModalOpen(true);
  };

  // Save Device Form (Create or Edit)
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (editingDevice) {
      setDevices(prev =>
        prev.map(d =>
          d.id === editingDevice.id
            ? {
                ...d,
                hostname: formHostname,
                model: formModel,
                serialNumber: formSerialNumber,
                ipAddress: formIpAddress,
                ipManagement: formIpManagement.trim() || undefined,
                siteLocation: formSiteLocation,
                role: formRole,
                licenseType: formLicenseType,
                licenseActiveDate: formLicenseActiveDate,
                licenseExpiredDate: formLicenseExpiredDate,
                status: formStatus,
                notes: formNotes,
                lastUpdated: nowStr,
              }
            : d
        )
      );
    } else {
      const newId = `DEV-${String(devices.length + 1).padStart(3, '0')}`;
      const newDev: DeviceItem = {
        id: newId,
        hostname: formHostname,
        model: formModel,
        serialNumber: formSerialNumber,
        ipAddress: formIpAddress,
        ipManagement: formIpManagement.trim() || undefined,
        siteLocation: formSiteLocation,
        role: formRole,
        licenseType: formLicenseType,
        licenseActiveDate: formLicenseActiveDate,
        licenseExpiredDate: formLicenseExpiredDate,
        status: formStatus,
        notes: formNotes,
        lastUpdated: nowStr,
      };
      setDevices(prev => [newDev, ...prev]);
    }

    setIsFormModalOpen(false);
  };

  // Delete Device
  const handleDeleteDevice = (id: string, hostname: string) => {
    if (confirm(`Hapus perangkat ${hostname} (${id}) dari daftar Manage Services?`)) {
      setDevices(prev => prev.filter(d => d.id !== id));
    }
  };

  // Download Template Excel
  const handleDownloadTemplateExcel = async () => {
    const templateData = [
      {
        'Hostname*': 'BSI-IBX-EXAMPLE01',
        'Model*': 'Infoblox TE-1415',
        'SerialNumber*': 'IBX-1415-12345X',
        'IPAddress*': '10.0.96.100',
        'IPAddressManagement': '10.0.96.200',
        'SiteLocation*': 'BSI Cabang Surabaya',
        'Role': 'Member DNS/DHCP',
        'LicenseType': 'NIOS Grid + DNSone',
        'LicenseActiveDate (YYYY-MM-DD)*': '2025-01-01',
        'LicenseExpiredDate (YYYY-MM-DD)*': '2027-01-01',
        'Status (ACTIVE/STANDBY/MAINTENANCE)': 'ACTIVE',
        'Notes': 'Catatan khusus perangkat',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Perangkat');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await saveOrShareFile({
      filename: 'Template_Upload_Perangkat_Manage_Services.xlsx',
      blob,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // Download Template CSV
  const handleDownloadTemplateCsv = async () => {
    const templateData = [
      {
        'Hostname*': 'BSI-IBX-EXAMPLE01',
        'Model*': 'Infoblox TE-1415',
        'SerialNumber*': 'IBX-1415-12345X',
        'IPAddress*': '10.0.96.100',
        'IPAddressManagement': '10.0.96.200',
        'SiteLocation*': 'BSI Cabang Surabaya',
        'Role': 'Member DNS/DHCP',
        'LicenseType': 'NIOS Grid + DNSone',
        'LicenseActiveDate (YYYY-MM-DD)*': '2025-01-01',
        'LicenseExpiredDate (YYYY-MM-DD)*': '2027-01-01',
        'Status (ACTIVE/STANDBY/MAINTENANCE)': 'ACTIVE',
        'Notes': 'Catatan khusus perangkat',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    await saveOrShareFile({
      filename: 'Template_Upload_Perangkat_Manage_Services.csv',
      blob,
      mimeType: 'text/csv',
    });
  };

  // Export Data to Excel
  const handleExportDataExcel = async () => {
    const dataToExport = devices.map(d => {
      const lic = getLicenseInfo(d.licenseExpiredDate);
      return {
        'ID Perangkat': d.id,
        'Hostname': d.hostname,
        'Model / Hardware': d.model,
        'Serial Number': d.serialNumber,
        'IP Address (LAN/Service)': d.ipAddress,
        'IP Address Management': d.ipManagement || '-',
        'Lokasi Site': d.siteLocation,
        'Role Grid': d.role,
        'Tipe Lisensi': d.licenseType,
        'License Active Date': d.licenseActiveDate,
        'License Expired Date': d.licenseExpiredDate,
        'Status Lisensi': lic.label,
        'Sisa Hari Lisensi': lic.days,
        'Status Operasional': d.status,
        'Catatan': d.notes || '-',
        'Terakhir Diperbarui': d.lastUpdated,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perangkat_Manage_Services');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename = `Daftar_Perangkat_Manage_Services_BSI_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await saveOrShareFile({
      filename,
      blob,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // Export Data to CSV
  const handleExportDataCsv = async () => {
    const dataToExport = devices.map(d => ({
      ID: d.id,
      Hostname: d.hostname,
      Model: d.model,
      SerialNumber: d.serialNumber,
      IPAddress: d.ipAddress,
      IPAddressManagement: d.ipManagement || '',
      SiteLocation: d.siteLocation,
      Role: d.role,
      LicenseType: d.licenseType,
      LicenseActiveDate: d.licenseActiveDate,
      LicenseExpiredDate: d.licenseExpiredDate,
      LicenseStatus: getLicenseInfo(d.licenseExpiredDate).label,
      OperationalStatus: d.status,
      Notes: d.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `Daftar_Perangkat_Manage_Services_BSI_${new Date().toISOString().slice(0, 10)}.csv`;

    await saveOrShareFile({
      filename,
      blob,
      mimeType: 'text/csv',
    });
  };

  // Handle File Upload Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert('File kosong atau format tidak sesuai.');
          return;
        }

        const parsedDevices: DeviceItem[] = jsonData.map((row: any, idx: number) => {
          // Normalize column keys
          const hostname = row['Hostname*'] || row['Hostname'] || row['hostname'] || `HOST-${idx + 1}`;
          const model = row['Model*'] || row['Model'] || row['model'] || 'Infoblox Appliance';
          const serialNumber = row['SerialNumber*'] || row['SerialNumber'] || row['Serial Number'] || row['serial_number'] || '-';
          const ipAddress = row['IPAddress*'] || row['IPAddress'] || row['IP Address'] || row['ip'] || '-';
          const ipManagement = row['IPAddressManagement'] || row['IP Address Management'] || row['IP Management'] || row['ip_management'] || row['ipManagement'] || '';
          const siteLocation = row['SiteLocation*'] || row['SiteLocation'] || row['Site Location'] || row['Lokasi'] || 'BSI Site';
          const role = row['Role'] || row['role'] || 'Member';
          const licenseType = row['LicenseType'] || row['License Type'] || row['Tipe Lisensi'] || 'NIOS License';
          
          let licenseActiveDate = row['LicenseActiveDate (YYYY-MM-DD)*'] || row['LicenseActiveDate'] || row['License Active Date'] || new Date().toISOString().slice(0, 10);
          let licenseExpiredDate = row['LicenseExpiredDate (YYYY-MM-DD)*'] || row['LicenseExpiredDate'] || row['License Expired Date'] || new Date().toISOString().slice(0, 10);

          // Handle Excel date numbers if applicable
          if (typeof licenseActiveDate === 'number') {
            licenseActiveDate = new Date(Math.round((licenseActiveDate - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
          }
          if (typeof licenseExpiredDate === 'number') {
            licenseExpiredDate = new Date(Math.round((licenseExpiredDate - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
          }

          const rawStatus = (row['Status (ACTIVE/STANDBY/MAINTENANCE)'] || row['Status'] || 'ACTIVE').toUpperCase();
          const status: DeviceItem['status'] = ['ACTIVE', 'STANDBY', 'MAINTENANCE'].includes(rawStatus) ? rawStatus : 'ACTIVE';
          const notes = row['Notes'] || row['notes'] || row['Catatan'] || '';

          return {
            id: `DEV-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
            hostname: String(hostname).trim(),
            model: String(model).trim(),
            serialNumber: String(serialNumber).trim(),
            ipAddress: String(ipAddress).trim(),
            ipManagement: ipManagement ? String(ipManagement).trim() : undefined,
            siteLocation: String(siteLocation).trim(),
            role: String(role).trim(),
            licenseType: String(licenseType).trim(),
            licenseActiveDate: String(licenseActiveDate).trim(),
            licenseExpiredDate: String(licenseExpiredDate).trim(),
            status,
            notes: String(notes).trim(),
            lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        });

        setUploadedPreview(parsedDevices);
      } catch (err: any) {
        console.error('Error parsing uploaded file:', err);
        alert(`Gagal memproses file: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (uploadedPreview.length === 0) return;

    if (uploadMode === 'replace') {
      setDevices(uploadedPreview);
    } else {
      // Append, avoid exact duplicate serial number
      setDevices(prev => {
        const existingSerials = new Set(prev.map(p => p.serialNumber.toLowerCase()));
        const newOnes = uploadedPreview.filter(u => !existingSerials.has(u.serialNumber.toLowerCase()) || u.serialNumber === '-');
        return [...prev, ...newOnes];
      });
    }

    alert(`Berhasil mengimpor ${uploadedPreview.length} perangkat Manage Services!`);
    setIsUploadModalOpen(false);
    setUploadedPreview([]);
    setUploadFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <HardDrive size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Daftar Perangkat Manage Services
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Manajemen inventaris perangkat Infoblox, status operasional, serta monitoring masa aktif & expired date lisensi
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadTemplateExcel}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Unduh Template Excel untuk upload data perangkat"
          >
            <Download size={14} /> Unduh Template Upload
          </button>
          <button
            onClick={() => {
              setUploadedPreview([]);
              setUploadFileName('');
              setIsUploadModalOpen(true);
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Upload size={14} /> Upload Data (Excel/CSV)
          </button>
          <button
            onClick={handleExportDataExcel}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Download seluruh data perangkat format Excel"
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Tambah Perangkat
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
      }}>
        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Perangkat</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalDevices}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Grid & Cluster Infoblox</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981' }}>Lisensi Aktif</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {activeLicenses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Masa berlaku {'>'} 90 hari</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#eab308' }}>Segera Expired</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#eab308', marginTop: '4px' }}>
            {warningLicenses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Masa berlaku 31 - 90 hari</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#f97316' }}>Kritis ({'<'} 30 Hari)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f97316', marginTop: '4px' }}>
            {criticalLicenses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Perlu proses perpanjangan segera</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Lisensi Expired</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
            {expiredLicenses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Kadaluarsa / Butuh lisensi baru</div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 340px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari hostname, IP, serial number, lokasi site, model..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={filterLicenseStatus}
              onChange={e => setFilterLicenseStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            >
              <option value="ALL">Semua Status Lisensi</option>
              <option value="ACTIVE">Aktif ({'>'} 90 hari)</option>
              <option value="WARNING">Segera Expired (31-90 hari)</option>
              <option value="CRITICAL">Kritis ({'<'} 30 hari)</option>
              <option value="EXPIRED">Sudah Expired</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filteredDevices.length}</strong> dari {devices.length} perangkat
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '14px 16px' }}>Hostname & Model</th>
                <th style={{ padding: '14px 16px' }}>Serial Number & IP</th>
                <th style={{ padding: '14px 16px' }}>Lokasi / Site BSI</th>
                <th style={{ padding: '14px 16px' }}>Role & Tipe Lisensi</th>
                <th style={{ padding: '14px 16px' }}>Periode Lisensi</th>
                <th style={{ padding: '14px 16px' }}>Status Lisensi</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Tidak ada perangkat yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredDevices.map(item => {
                  const lic = getLicenseInfo(item.licenseExpiredDate);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Server size={14} style={{ color: 'var(--accent-primary)' }} />
                          {item.hostname}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.model}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {item.ipAddress}
                        </div>
                        {item.ipManagement && (
                          <div style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700 }}>MGMT</span>
                            <span>{item.ipManagement}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          SN: {item.serialNumber}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                          {item.siteLocation}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {item.notes}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {item.role}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {item.licenseType}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={12} />
                          <span>Mulai: {item.licenseActiveDate}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                          <Clock size={12} style={{ color: lic.color }} />
                          <span>Exp: {item.licenseExpiredDate}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 10px', borderRadius: '16px', fontSize: '0.74rem', fontWeight: 600,
                          backgroundColor: lic.bgColor, color: lic.color, border: `1px solid ${lic.borderColor}`,
                        }}>
                          {lic.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                          {lic.status === 'WARNING' && <Clock size={12} />}
                          {lic.status === 'CRITICAL' && <AlertTriangle size={12} />}
                          {lic.status === 'EXPIRED' && <ShieldAlert size={12} />}
                          {lic.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Perbaiki / Edit Data Perangkat"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(item.id, item.hostname)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            title="Hapus Perangkat"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Manual & Edit Perangkat */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            width: '100%', maxWidth: '620px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)',
              position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingDevice ? 'Perbaiki Data Perangkat Manage Services' : 'Tambah Perangkat Manage Services'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Hostname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BSI-IBX-GM01"
                    value={formHostname}
                    onChange={e => setFormHostname(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Model / Hardware *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Infoblox TE-1415 / TE-2215"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IBX-1415-44210C"
                    value={formSerialNumber}
                    onChange={e => setFormSerialNumber(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Lokasi / Site BSI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BSI Kantor Pusat (Wisma Atlet), BSI Menara Thamrin"
                    value={formSiteLocation}
                    onChange={e => setFormSiteLocation(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    IP Address (LAN / Service) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 10.0.96.53"
                    value={formIpAddress}
                    onChange={e => setFormIpAddress(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    IP Address Management
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 10.0.96.153 (MGMT / OOB)"
                    value={formIpManagement}
                    onChange={e => setFormIpManagement(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Role Perangkat
                  </label>
                  <input
                    type="text"
                    placeholder="Grid Master, GMC, Member DNS/DHCP"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Tipe Lisensi
                  </label>
                  <input
                    type="text"
                    placeholder="NIOS Grid, DNSone, Threat Insight"
                    value={formLicenseType}
                    onChange={e => setFormLicenseType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* License Dates: Active & Expired */}
              <div style={{
                padding: '14px', borderRadius: '10px',
                backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-subtle)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    License Active Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formLicenseActiveDate}
                    onChange={e => setFormLicenseActiveDate(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tanggal mulai aktif lisensi
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    License Expired Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formLicenseExpiredDate}
                    onChange={e => setFormLicenseExpiredDate(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tanggal kadaluarsa lisensi
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Status Operasional
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as DeviceItem['status'])}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  >
                    <option value="ACTIVE">ACTIVE (Normal / Berjalan)</option>
                    <option value="STANDBY">STANDBY (Cadangan HA)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Pemeliharaan)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Catatan / Tier Support
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan perangkat..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingDevice ? 'Simpan Perubahan' : 'Tambah Perangkat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Data Excel / CSV */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            width: '100%', maxWidth: '720px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Upload Data Perangkat Manage Services
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Unggah file Excel (.xlsx, .xls) atau CSV sesuai template format lisensi
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Template Download Prompt */}
              <div style={{
                padding: '14px 18px', borderRadius: '10px',
                backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Info size={20} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Belum memiliki template kolom lisensi?
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Gunakan template resmi agar kolom Hostname, SN, Active Date, dan Expired Date terbaca otomatis.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleDownloadTemplateExcel}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Download size={12} /> Template Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleDownloadTemplateCsv}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Download size={12} /> Template CSV
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-primary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Upload size={32} style={{ color: 'var(--accent-primary)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {uploadFileName ? uploadFileName : 'Pilih File Excel / CSV untuk Diunggah'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Format yang didukung: .xlsx, .xls, .csv
                </div>
              </div>

              {/* Upload Options */}
              {uploadedPreview.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Metode Import:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="uploadMode"
                      checked={uploadMode === 'append'}
                      onChange={() => setUploadMode('append')}
                    />
                    Tambahkan ke data yang ada (Append)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="uploadMode"
                      checked={uploadMode === 'replace'}
                      onChange={() => setUploadMode('replace')}
                    />
                    Timpa seluruh data lama (Replace)
                  </label>
                </div>
              )}

              {/* Preview Table */}
              {uploadedPreview.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Preview Data Terdeteksi ({uploadedPreview.length} Perangkat)
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Pastikan tanggal dan hostname sudah sesuai
                    </span>
                  </div>

                  <div style={{
                    maxHeight: '220px', overflowY: 'auto', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 10px' }}>Hostname</th>
                          <th style={{ padding: '8px 10px' }}>Serial Number</th>
                          <th style={{ padding: '8px 10px' }}>Lokasi Site</th>
                          <th style={{ padding: '8px 10px' }}>Active Date</th>
                          <th style={{ padding: '8px 10px' }}>Expired Date</th>
                          <th style={{ padding: '8px 10px' }}>Status Lisensi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedPreview.map((p, idx) => {
                          const lic = getLicenseInfo(p.licenseExpiredDate);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.hostname}</td>
                              <td style={{ padding: '8px 10px' }}>{p.serialNumber}</td>
                              <td style={{ padding: '8px 10px' }}>{p.siteLocation}</td>
                              <td style={{ padding: '8px 10px' }}>{p.licenseActiveDate}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.licenseExpiredDate}</td>
                              <td style={{ padding: '8px 10px', color: lic.color, fontWeight: 600 }}>{lic.label}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={uploadedPreview.length === 0}
                  onClick={handleConfirmImport}
                  className="btn btn-primary"
                  style={{ opacity: uploadedPreview.length === 0 ? 0.5 : 1 }}
                >
                  Konfirmasi Import ({uploadedPreview.length} Perangkat)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
