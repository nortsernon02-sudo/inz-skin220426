import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Pencil, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Plus,
  Trash2,
  LogOut,
  History,
  TrendingUp,
  DollarSign,
  Save,
  User,
  ChevronRight,
  Activity,
  Package,
  Download,
} from 'lucide-react';

import EmployeeDashboard from './components/EmployeeDashboard.tsx';

// --- Firebase Config ---
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  where,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA0P2Ye-n8ltFLbDodFjk-c2b7-SMA8Zy0',
  authDomain: 'inz-project.firebaseapp.com',
  projectId: 'inz-project',
  storageBucket: 'inz-project.appspot.com',
  messagingSenderId: '528466496621',
  appId: '1:528466496621:web:0e99a617ae2b8fdaba0364',
  measurementId: 'G-1GGSSNDTM4',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function CosmeticSalesDashboard() {
  const getToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const getCurrentMonth = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 7); // YYYY-MM
  };

  

  // 1. Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  // 'daily', 'weekly', 'monthly'
  const [timeRange, setTimeRange] = useState('daily');
  const [isEditing, setIsEditing] = useState(false);
  // 2. Dashboard State
  const [activeTab, setActiveTab] = useState<
  'dashboard' | 'input' | 'history' | 'employee'
>('dashboard');

  const [records, setRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // สำหรับช่องค้นหา
  const [currentPage, setCurrentPage] = useState(1); // สำหรับหน้าปัจจุบัน
  const recordsPerPage = 10; // กำหนดให้แสดง 10 รายการต่อหน้า
  const pageSize = 10;
  const [editingId, setEditingId] = useState(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedMonthEmployee, setSelectedMonthEmployee] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // 3. Form Input States (แบบละเอียดตามรูป)
  const [hn, setHn] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [skinItems, setSkinItems] = useState([
    {
      name: '',
      fullPrice: '', // ต้องมีตัวนี้
      percent: '100', // ต้องมีตัวนี้
      price: 0,
    },
  ]);

  const [productItems, setProductItems] = useState([{ name: '', price: '' }]);
  const [otherItems, setOtherItems] = useState<any[]>([
    { name: '', price: '', percent: '100', calculatedPrice: 0 },
  ]);

  // ฟังก์ชันสำหรับค่าคอมฯ หัตถการ
  const updateOtherSale = (index: number, field: string, value: any) => {
    const newSales = [...otherItems];
    const updatedItem = { ...newSales[index], [field]: value };

    // คำนวณราคา (ราคาเต็ม * %)
    const fullPriceNum = Number(updatedItem.price) || 0;
    const percentNum = Number(updatedItem.percent) || 100;
    updatedItem.calculatedPrice = (fullPriceNum * percentNum) / 100;

    newSales[index] = updatedItem;
    setOtherItems(newSales);
  };
  // ฟังก์ชันสำหรับ Package Skin (แยกออกมา ไม่ซ้อนกัน)
  const updateSkinItem = (index: number, field: string, value: any) => {
    const newItems = [...skinItems];
    const updatedItem = { ...newItems[index], [field]: value };

    // คำนวณราคา (ราคาเต็ม * %)
    const fullPriceNum = Number(updatedItem.fullPrice) || 0;
    const percentNum = Number(updatedItem.percent) || 100;
    updatedItem.price = (fullPriceNum * percentNum) / 100;

    newItems[index] = updatedItem;
    setSkinItems(newItems);
  };


  
  // ดึงข้อมูลจาก Firebase
  // --- ส่วนที่ 1: ดึงข้อมูลจาก Firebase ---
  useEffect(() => {
    if (!isLoggedIn || !employeeId) return;
    const q = query(
      collection(db, 'sales_records'),
      where('employeeId', '==', employeeId),
      orderBy('recordDate', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRecords(data);
      },
      (error) => {
        console.error('Snapshot error:', error);
      }
    );
    return () => unsubscribe();
  }, [isLoggedIn, employeeId]);

  // 2. Logic การ Search (เปลี่ยนชื่อเป็น displayRecords เพื่อไม่ให้ขีดแดงซ้ำกับของเก่า)
  const displayRecords = records.filter((r: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (r.hn && r.hn.toLowerCase().includes(searchLower)) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchLower)) ||
      (r.recordDate && r.recordDate.includes(searchTerm))
    );
  });

  // 3. Logic การ Pagination (แบ่งหน้า)
  const totalPages = Math.ceil(displayRecords.length / recordsPerPage) || 1;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

  // ** currentRecords คือตัวแปรที่จะเอาไปใช้แสดงในตาราง (Map) **
  const currentRecords = displayRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  // 1. กรองข้อมูลเฉพาะเดือนที่เลือกจาก UI
  const filteredRecords = useMemo(() => {
    return records.filter(
      (r: any) => r.recordDate && r.recordDate.startsWith(selectedMonth)
    );
  }, [records, selectedMonth]);

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );



  // 2. ฟังก์ชันจัดกลุ่มข้อมูลสำหรับกราฟ
  const getChartData = () => {
    const grouped: Record<string, any> = {};

    if (timeRange === 'monthly') {
      records.forEach((r: any) => {
        if (!r.recordDate) return;

        const key = r.recordDate.substring(0, 7); // YYYY-MM

        if (!grouped[key]) {
          grouped[key] = {
            month: key,
            skinPrice: 0,
            productPrice: 0,
            otherPrice: 0,
          };
        }

        grouped[key].skinPrice += Number(r.skinPrice || 0);
        grouped[key].productPrice += Number(r.productPrice || 0);
        grouped[key].otherPrice += Number(r.otherPrice || 0);
      });

      return Object.values(grouped).sort((a: any, b: any) =>
        a.month.localeCompare(b.month)
      );
    }

    // ✅ daily ใช้ filteredRecords (ตามเดือนที่เลือก)
    filteredRecords.forEach((r: any) => {
      const key = r.recordDate;

      if (!grouped[key]) {
        grouped[key] = {
          recordDate: key,
          skinPrice: 0,
          productPrice: 0,
          otherPrice: 0,
        };
      }

      grouped[key].skinPrice += Number(r.skinPrice || 0);
      grouped[key].productPrice += Number(r.productPrice || 0);
      grouped[key].otherPrice += Number(r.otherPrice || 0);
    });

    return Object.values(grouped).sort((a: any, b: any) =>
      a.recordDate.localeCompare(b.recordDate)
    );
  };

  // 2. คำนวณยอดรวมจากข้อมูลที่กรองแล้ว (filteredRecords)
  const summary = useMemo(() => {
    const productTotal = filteredRecords.reduce(
      (sum, r) => sum + (Number(r.productPrice) || 0),
      0
    );
    const skinTotal = filteredRecords.reduce(
      (sum, r) => sum + (Number(r.skinPrice) || 0),
      0
    );

    const otherTotal = filteredRecords.reduce(
      (sum, r) => sum + (Number(r.otherPrice) || 0),
      0
    );
    // ----------------------

    const productTiers = [
      { goal: 50000, reward: 1000 },
      { goal: 100000, reward: 3000 },
      { goal: 200000, reward: 8000 },
    ];
    const achievedProductReward =
      [...productTiers].reverse().find((t) => productTotal >= t.goal)?.reward ||
      0;

    const skinTiers = [
      { goal: 50000, reward: 750 },
      { goal: 100000, reward: 2000 },
      { goal: 200000, reward: 5000 },
    ];
    const achievedSkinReward =
      [...skinTiers].reverse().find((t) => skinTotal >= t.goal)?.reward || 0;

    return {
      totalSales: productTotal + skinTotal, //ยอด product + ยอดSkinPackage
      productTotal, //ยอด product
      skinTotal, //ยอด SkinPackage
      otherTotal, // ยอดหัตถการ
      estimatedCommission: achievedProductReward + achievedSkinReward,
    };
  }, [filteredRecords]);


  const employeeSummary = useMemo(() => {
    return employees
      .filter((emp) => emp.role?.trim().toLowerCase() === 'admin') // ✅ กรองตรงนี้
      .map((emp) => {
        const userRecords = filteredRecords.filter(
          (r) => r.employeeId === emp.id
        );
  
        let totalSkin = 0;
        let totalProduct = 0;
        let totalOther = 0;
  
        userRecords.forEach((r: any) => {
          totalSkin += Number(r.skinPrice) || 0;
          totalProduct += Number(r.productPrice) || 0;
  
          if (r.otherItems && Array.isArray(r.otherItems)) {
            r.otherItems.forEach((item: any) => {
              totalOther += Number(item.calculatedPrice || item.price) || 0;
            });
          } else {
            totalOther += Number(r.otherPrice) || 0;
          }
        });
  
        const calculateTier = (skin: number) => {
          if (skin >= 500000) return 5000;
          if (skin >= 200000) return 2000;
          if (skin >= 50000) return 750;
          return 0;
        };
  
        const commission = calculateTier(totalSkin);
  
        return {
          id: emp.id,
          name: emp.name || emp.id,
  
          commission,
          procedure: totalOther,
          product: totalProduct,
  
          income: commission + totalOther,
          totalSales: totalSkin + totalProduct + totalOther,
        };
      });
  }, [employees, filteredRecords]);


  // ฟังก์ชัน Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId.trim()) {
      alert('กรุณากรอกรหัสพนักงาน');
      return;
    }

    try {
      // 🔥 เช็คจาก Firestore
      const userRef = doc(db, 'authorized_users', employeeId.trim());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data(); // ✅ เพิ่ม
        const name = userData.name || employeeId; // ✅ เพิ่ม

        alert(`ยินดีต้อนรับ คุณ${name}`); // ✅ เพิ่ม

        localStorage.setItem('employeeId', employeeId.trim());
      localStorage.setItem('role', userData.role || '');

      console.log('LOGIN SUCCESS:', {
        id: employeeId.trim(),
        ...userData
      });

        // ✅ มีสิทธิ์เข้า
        setIsLoggedIn(true);
        setActiveTab('dashboard');
        setSelectedMonth(getCurrentMonth());
      } else {
        // ❌ ไม่มีในระบบ
        alert('ไม่มีสิทธิ์เข้าใช้งานระบบ');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  // เพิ่มฟังก์ชันลบข้อมูลพร้อมรหัสผ่าน
  // 🔥 SUBMIT (รองรับ add + update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hn || !customerName) {
      alert('กรุณากรอกรหัสลูกค้า (HN) และชื่อ-นามสกุล');
      return;
    }

    try {
      const totalSkin = skinItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
      );
      const totalProduct = productItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
      );
      const totalOther = otherItems.reduce(
        (sum, item) => sum + (Number(item.calculatedPrice) || 0),
        0
      );

      const newRecord = {
        employeeId,
        hn,
        customerName,
        recordDate,
        skinItems,
        productItems,
        otherItems,
        skinPrice: totalSkin,
        productPrice: totalProduct,
        otherPrice: totalOther,
        updatedAt: new Date().toISOString(),
      };

      // 🔥 แยก add / update
      if (isEditing && editingId !== null) {
        await updateDoc(doc(db, 'sales_records', editingId), newRecord);
      } else {
        await addDoc(collection(db, 'sales_records'), {
          ...newRecord,
          createdAt: new Date().toISOString(),
        });
      }

      // 🔥 reset state
      setIsEditing(false);
      setEditingId(null);

      alert('บันทึกข้อมูลเรียบร้อยแล้ว!');

      // 🔥 reset form
      setHn('');
      setCustomerName('');
      setRecordDate(getToday()); // ✅ เพิ่มบรรทัดนี้
      setSkinItems([{ name: '', fullPrice: '', percent: '100', price: 0 }]);
      setProductItems([{ name: '', price: '' }]);
      setOtherItems([
        { name: '', price: '', percent: '100', calculatedPrice: 0 },
      ]);

      setActiveTab('dashboard');
    } catch (error) {
      console.error('Error saving record: ', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // 🔥 DELETE (เหมือนเดิม ใช้ได้แล้ว)
  const handleDelete = async (id: string) => {
    const password = window.prompt('กรุณากรอกรหัสผ่านเพื่อยืนยันการลบข้อมูล:');

    if (password === '1397') {
      if (window.confirm('รหัสถูกต้อง! คุณแน่ใจใช่ไหมที่จะลบรายการนี้?')) {
        try {
          await deleteDoc(doc(db, 'sales_records', id));
        } catch (err) {
          console.error('Error deleting:', err);
          alert('ไม่สามารถลบข้อมูลได้');
        }
      }
    } else if (password !== null) {
      alert('รหัสผ่านไม่ถูกต้อง! ไม่สามารถลบข้อมูลได้');
    }
  };

  // 🔥 EDIT (ไม่ลบแล้ว!)
  const handleEdit = async (record: any) => {
    if (!record) return;

    if (isEditing) {
      alert('คุณกำลังแก้ไขข้อมูลอยู่\nกรุณาบันทึกให้เรียบร้อยก่อน');
      return;
    }

    const password = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขรายการนี้:');

    if (password !== '1397') {
      alert('รหัสผ่านไม่ถูกต้อง! ไม่สามารถแก้ไขได้');
      return;
    }

    if (window.confirm('ต้องการแก้ไขรายการนี้ใช่หรือไม่?')) {
      try {
        // 🔥 set form
        setHn(record.hn || '');
        setCustomerName(record.customerName || '');
        setRecordDate(
          record.recordDate || new Date().toISOString().split('T')[0]
        );

        setSkinItems(
          record.skinItems?.length > 0
            ? record.skinItems
            : [{ name: '', fullPrice: '', percent: '100', price: 0 }]
        );

        setProductItems(
          record.productItems?.length > 0
            ? record.productItems
            : [{ name: '', price: '' }]
        );

        setOtherItems(
          record.otherItems?.length > 0
            ? record.otherItems
            : [{ name: '', price: '', percent: '100', calculatedPrice: 0 }]
        );

        // 🔥 สำคัญมาก
        setIsEditing(true);
        setEditingId(record.id);

        handleChangeTab('input');
      } catch (err) {
        console.error('Edit Error:', err);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    }
  };

  // 🔥 CANCEL EDIT (เพิ่มใหม่)
  const handleCancelEdit = () => {
    if (window.confirm('ยกเลิกการแก้ไขใช่หรือไม่?')) {
      setIsEditing(false);
      setEditingId(null);

      // 🔥 reset form ทั้งหมด
      setHn('');
      setCustomerName('');
      setRecordDate(getToday()); // ✅ เพิ่มบรรทัดนี้
      setSkinItems([{ name: '', fullPrice: '', percent: '100', price: 0 }]);
      setProductItems([{ name: '', price: '' }]);
      setOtherItems([
        { name: '', price: '', percent: '100', calculatedPrice: 0 },
      ]);

      // (ถ้ามี) กลับหน้า dashboard
      setActiveTab('dashboard');
    }
  };

  // 🔥 LOCK TAB
  const handleChangeTab = (tab: any) => {
    if (isEditing) {
      alert('กรุณาแก้ไขข้อมูลให้เรียบร้อยก่อน');
      return;
    }
    setActiveTab(tab);
  };

  // 🔥 LOCK LOGOUT
  const handleLogout = () => {
    if (isEditing) {
      alert('กรุณาแก้ไขข้อมูลให้เรียบร้อยก่อน');
      return;
    }

    setIsLoggedIn(false);
    setEmployeeId('');
    setRecords([]);
    setSelectedMonth(getCurrentMonth());
  };

  // --- ฟังก์ชันดาวน์โหลด CSV ---
  const downloadCSV = () => {
    // กำหนดหัวตาราง
    const headers = ['วันที่,HN,Package Skin,Product,ยอดขายแยก'];
    // ดึงข้อมูลจาก records มาเรียงตามหัวข้อ
    const rows = records.map(
      (r) =>
        `${r.recordDate},${r.hn || '-'},${r.skinPrice || 0},${
          r.productPrice || 0
        },${r.otherPrice || 0}`
    );
    // รวมหัวและข้อมูล พร้อมใส่ BOM (\uFEFF) เพื่อให้ Excel อ่านภาษาไทยออก
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `รายงานยอดขาย_${employeeId}_${new Date().toLocaleDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI: หน้า LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center">
          <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="text-pink-500" size={40} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">
            เข้าสู่ระบบพนักงาน
          </h1>
          <p className="text-gray-400 text-sm mb-8 font-bold uppercase tracking-widest">
            Sales Dashboard for Cosmetic&Skin
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="ระบุรหัสพนักงานของคุณ..."
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
            />
            <button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-100 transition-all">
              เข้าใช้งานระบบ <ChevronRight size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- UI: หน้า DASHBOARD หลัก ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {/* ไอคอนกราฟสีชมพู */}
          <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none">
              Sales Dashboard
            </h1>
            {/* ตัวแปร employeeId ที่กรอกตอน Login */}
            <p className="text-gray-500 font-bold mt-1 text-sm">
              สวัสดี, {employeeId}
            </p>
          </div>
        </div>

        {/* ปุ่มออกจากระบบ */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold transition-all pt-2"
        >
          <span>ออกจากระบบ</span>
          <LogOut size={20} />
        </button>
      </div>

      {/* --- Tap Menu --- */}
      <div className="max-w-7xl mx-auto mb-8 flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm w-fit border border-gray-100">
  {(['dashboard', 'input', 'history', 'employee'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${
        activeTab === tab
          ? 'bg-pink-500 text-white shadow-md'
          : 'text-gray-400 hover:bg-gray-50'
      }`}
    >
      {tab === 'dashboard'
        ? 'ภาพรวม'
        : tab === 'input'
        ? '+ บันทึกยอด'
        : tab === 'history'
        ? 'ประวัติฯ'
        : 'พนักงาน'}
    </button>
  ))}
</div>
      <div className="max-w-7xl mx-auto">
        {/* --- PAGE: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 w-full">
            {/* 1. วางส่วนเลือกเดือนตรงนี้ */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 w-fit">
              <div className="bg-pink-100 p-2 rounded-lg text-pink-500">
                <History size={26} />
              </div>
              <div className="flex flex-col">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-wider">
                  เลือกเดือนที่แสดง
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-gray-800 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <StatCard
                    label="ค่าคอมมิชชั่น"
                    value={summary.estimatedCommission}
                    color="emerald"
                    // sub="คำนวณตาม Tier ปัจจุบัน"
                    extraInfo={{
                      label: 'ค่าคอมหัตถการ',
                      value: summary.otherTotal,
                    }}
                  />
                  <StatCard
                    label="ยอดขายรวมทั้งหมด"
                    value={summary.totalSales}
                    color="blue"
                    sub={`ประจำเดือน ${selectedMonth}`}
                    extraInfo={{
                      label: '(ค่าคอมฯ + ค่าหัตถการ)',
                      value: summary.estimatedCommission + summary.otherTotal,
                    }}
                  />
                </div>

                {/* --- ส่วน Incentive: ปรับให้กางกว้างเต็มและเท่ากัน 50/50 --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <IncentiveCard
                    title="Incentive: Products"
                    current={summary.productTotal}
                    accentColor="rose"
                    tiers={[
                      { goal: 50000, rate: '2%', reward: 1000 },
                      { goal: 100000, rate: '3%', reward: 3000 },
                      { goal: 200000, rate: '4%', reward: 8000 },
                    ]}
                  />

                  <IncentiveCard
                    title="Incentive: Skin Package"
                    current={summary.skinTotal}
                    accentColor="emerald"
                    tiers={[
                      { goal: 50000, rate: '1.5%', reward: 750 },
                      { goal: 200000, rate: '2%', reward: 2000 },
                      { goal: 500000, rate: '2.5%', reward: 5000 },
                    ]}
                  />
                </div>
              </div>
              <div className="bg-pink-500 p-3 rounded-[1rem] shadow-l text-white h-fit">
                <h3 className="text-l font-black mb-2 flex items-center gap-3">
                  <TrendingUp size={24} />
                  เป้าหมายถัดไป
                </h3>
                <div className="space-y-2">
                  {summary.productTotal >= 50000 &&
                  summary.skinTotal >= 50000 ? (
                    <div className="text-center py-4 animate-bounce">
                      <span className="text-2xl">🎉</span>
                      <span className="font-bold text-lg ml-2">
                        สูงสุดแล้ว!
                      </span>
                      <span className="text-2xl ml-2">🎉</span>
                    </div>
                  ) : (
                    <>
                      <ProgressBar
                        label="Product"
                        current={summary.productTotal}
                        goal={50000}
                      />
                      <ProgressBar
                        label="Skin"
                        current={summary.skinTotal}
                        goal={50000}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            
            {/* กราฟแท่งซ้อนกัน (เพิ่มปุ่มเลือกช่วงเวลาและแสดงผล 3 หมวดหมู่) */}
            <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-gray-100 h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="font-black text-gray-800 text-lg">
                    แนวโน้มยอดขาย{timeRange === 'daily' ? 'รายวัน' : 'รายเดือน'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    สรุปภาพรวมแยกตามประเภทรายการ
                  </p>
                </div>
                

                {/* ปุ่มเลือกช่วงเวลา (เหลือแค่ daily / monthly) */}
                <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl">
                  {['daily', 'monthly'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTimeRange(type)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                        timeRange === type
                          ? 'bg-white text-emerald-500 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {type === 'daily' ? 'รายวัน' : 'รายเดือน'}
                    </button>
                  ))}
                </div>
              </div>



          <div className="w-full overflow-x-auto">
            <div
                style={{
                width: timeRange === 'daily'
                ? `${getChartData().length * 130}px` // กำหนดความกว้างตามจำนวนวัน
                  : '100%',
                          }}
                  >
                <ResponsiveContainer width="100%" height={350}>
                 <BarChart
                 data={getChartData()}
                 barSize={timeRange === 'daily' ? 40 : 60}
                 margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                   >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey={timeRange === 'daily' ? 'recordDate' : 'month'} 
                    fontSize={10}
                    tick={{ fill: '#9ca3af' }}
                    dy={10}
                  />

                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                  />

                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[200px]">
                            <p className="font-bold text-gray-800 mb-2 border-b pb-1">
                              {label}
                            </p>
                            <div className="space-y-1">
                              <p className="text-[#2dd4bf] font-bold text-xs flex justify-between">
                                <span>Skin Package:</span>
                                <span>
                                  ฿{payload[0]?.value?.toLocaleString()}
                                </span>
                              </p>
                              <p className="text-[#f43f5e] font-bold text-xs flex justify-between">
                                <span>Product:</span>
                                <span>
                                  ฿{payload[1]?.value?.toLocaleString()}
                                </span>
                              </p>
                              <p className="text-[#3b82f6] font-bold text-xs flex justify-between">
                                <span>ค่าคอมฯ หัตถการ:</span>
                                <span>
                                  ฿{payload[2]?.value?.toLocaleString()}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Bar dataKey="skinPrice" stackId="a" fill="#2dd4bf" />
                  <Bar dataKey="productPrice" stackId="a" fill="#f43f5e" />
                  <Bar
                    dataKey="otherPrice"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
          </div>
        )}

        {/* --- PAGE: INPUT (แบบละเอียดตามรูป) --- */}
        {activeTab === 'input' && (
          <div className="max-w-2xl mx-auto mb-10 bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-[#f43f5e] p-6 text-white flex items-center gap-3 font-black text-xl">
              <Plus /> บันทึกยอดขายใหม่
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 sm:p-8 space-y-6 max-w-full overflow-x-hidden">
                {/* ส่วน วันที่, HN และ ชื่อลูกค้า */}
                <div className="flex flex-col gap-4">
                  {/* วันที่ขาย */}
                  <div className="w-full flex flex-col space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">
                      วันที่ขาย
                    </label>
                    <div className="w-full overflow-hidden rounded-2xl">
                      <input
                        type="date"
                        value={recordDate}
                        onChange={(e) => setRecordDate(e.target.value)}
                        className="w-full p-4 bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-sm appearance-none"
                        style={{ minWidth: '0' }}
                      />
                    </div>
                  </div>

                  {/* รหัสลูกค้า (HN) */}
                  <div className="w-full flex flex-col space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">
                      รหัสลูกค้า (HN)
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุ HN"
                      value={hn}
                      onChange={(e) => setHn(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-sm"
                    />
                  </div>

                  {/* --- เพิ่มใหม่: ชื่อ-นามสกุลลูกค้า --- */}
                  <div className="w-full flex flex-col space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">
                      ชื่อ-นามสกุลลูกค้า
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อ-นามสกุล"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Section: Package Skin */}
                <div className="space-y-3">
                  <label className="text-m font-black text-gray-400 uppercase flex justify-between">
                    Package Skin ที่ขายได้ <span>ยอดรวม (฿)</span>
                  </label>
                  {skinItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      {skinItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSkinItems(skinItems.filter((_, i) => i !== idx))
                          }
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-rose-600 transition-colors"
                        >
                          <span className="text-xs font-black">✕</span>
                        </button>
                      )}
                      <div className="flex gap-2 min-w-0">
                        <input
                          type="text"
                          placeholder="ชื่อแพ็คเกจ..."
                          value={item.name}
                          onChange={(e) =>
                            updateSkinItem(idx, 'name', e.target.value)
                          }
                          className="flex-[2] min-w-0 p-4 bg-white rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                        />
                        <select
                          value={item.percent || '100'}
                          onChange={(e) =>
                            updateSkinItem(idx, 'percent', e.target.value)
                          }
                          className="flex-1 min-w-[70px] p-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-emerald-500 cursor-pointer text-center text-sm"
                        >
                          <option value="100">100%</option>
                          <option value="75">75%</option>
                          <option value="50">50%</option>
                          <option value="25">25%</option>
                        </select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-400 ml-2 mb-1">
                            ราคาเต็ม (฿)
                          </p>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.fullPrice}
                            onChange={(e) =>
                              updateSkinItem(idx, 'fullPrice', e.target.value)
                            }
                            className="w-full p-4 bg-white rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-gray-400 font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-green-500 ml-2 mb-1">
                            ยอดที่ได้รับจริง (฿)
                          </p>
                          <div className="w-full p-4 bg-green-50 rounded-xl text-green-600 font-black text-center border border-green-100">
                            {Number(item.price || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSkinItems([
                        ...skinItems,
                        { name: '', fullPrice: '', percent: '100', price: 0 },
                      ])
                    }
                    className="text-rose-500 text-xs font-black hover:underline mt-1 ml-2"
                  >
                    + เพิ่มรายการแพ็คเกจ
                  </button>
                </div>

                {/* Section: Product ที่ขายได้ */}
                <div className="space-y-3">
                  <label className="text-m font-black text-gray-400 uppercase flex justify-between">
                    Product ที่ขายได้ <span>ราคา (฿)</span>
                  </label>
                  {productItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      {productItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setProductItems(
                              productItems.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md z-10 hover:bg-rose-600 transition-colors"
                        >
                          <span className="text-xs font-black">✕</span>
                        </button>
                      )}
                      <div className="flex gap-2 min-w-0">
                        <input
                          type="text"
                          placeholder="ชื่อสินค้า"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...productItems];
                            newItems[idx].name = e.target.value;
                            setProductItems(newItems);
                          }}
                          className="flex-[2] min-w-0 p-4 bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                        />
                        <input
                          type="number"
                          placeholder="ราคา"
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...productItems];
                            newItems[idx].price = e.target.value;
                            setProductItems(newItems);
                          }}
                          className="flex-1 min-w-0 p-4 bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 font-bold text-center text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setProductItems([
                        ...productItems,
                        { name: '', price: '' },
                      ])
                    }
                    className="text-rose-500 text-xs font-black hover:underline mt-1 ml-2"
                  >
                    + เพิ่มรายการสินค้า
                  </button>
                </div>

                {/* Section: Other Commissions (หัตถการ) */}
                <div className="space-y-3">
                  <label className="text-m font-black text-gray-400 uppercase flex justify-between">
                    ค่าคอมฯ หัตถการ <span>ราคา (฿)</span>
                  </label>
                  {otherItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      {otherItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOtherItems(
                              otherItems.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-90 transition-all z-10"
                        >
                          <span className="text-xs font-black">✕</span>
                        </button>
                      )}
                      <div className="flex gap-2 min-w-0">
                        <input
                          type="text"
                          placeholder="ระบุรายการ..."
                          value={item.name || ''}
                          onChange={(e) => {
                            const newItems = [...otherItems];
                            newItems[idx].name = e.target.value;
                            setOtherItems(newItems);
                          }}
                          className="flex-[2] min-w-0 p-4 bg-white rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                        />
                        <select
                          value={item.percent || '100'}
                          onChange={(e) => {
                            const pct = e.target.value;
                            const newItems = [...otherItems];
                            const basePrice = Number(newItems[idx].price) || 0;
                            newItems[idx] = {
                              ...newItems[idx],
                              percent: pct,
                              calculatedPrice: (basePrice * Number(pct)) / 100,
                            };
                            setOtherItems(newItems);
                          }}
                          className="flex-1 min-w-[70px] px-2 py-4 bg-white rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-600 cursor-pointer text-center text-sm"
                        >
                          <option value="100">100%</option>
                          <option value="75">75%</option>
                          <option value="50">50%</option>
                          <option value="25">25%</option>
                        </select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-400 ml-2 mb-1">
                            ราคาเต็ม (฿)
                          </p>
                          <input
                            type="number"
                            placeholder="ราคาเต็ม"
                            value={item.price || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newItems = [...otherItems];
                              const pct = Number(newItems[idx].percent) || 100;
                              newItems[idx] = {
                                ...newItems[idx],
                                price: val,
                                calculatedPrice: (Number(val) * pct) / 100,
                              };
                              setOtherItems(newItems);
                            }}
                            className="w-full p-4 bg-white rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-gray-400 font-bold text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-blue-500 ml-2 mb-1">
                            ยอดที่ได้รับจริง (฿)
                          </p>
                          <div className="w-full p-4 bg-blue-50 rounded-xl text-blue-600 font-black text-center text-sm">
                            {Number(
                              item.calculatedPrice || item.price || 0
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setOtherItems([
                        ...otherItems,
                        {
                          name: '',
                          price: '',
                          percent: '100',
                          calculatedPrice: 0,
                        },
                      ])
                    }
                    className="text-rose-500 text-xs font-black hover:underline mt-2"
                  >
                    + เพิ่มรายการขายหัตถการ
                  </button>
                </div>

                {/* ส่วนปุ่มบันทึกยอดขายด้านล่างสุดของฟอร์ม */}
                {/* ส่วนปุ่มบันทึก + ยกเลิก */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!hn.trim() || !customerName.trim()}
                    className={`flex-1 py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
                      !hn.trim() || !customerName.trim()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-rose-500 hover:bg-rose-600 active:scale-95'
                    }`}
                  >
                    <Save size={20} />
                    {isEditing ? 'อัปเดตข้อมูล' : 'บันทึกยอดขาย'}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-4 rounded-2xl font-black bg-gray-300 text-gray-800 hover:bg-gray-400"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* --- PAGE: HISTORY (หน้าประวัติการขาย) --- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* ส่วนหัวที่มีปุ่ม Download */}
            <div className="flex justify-between items-center px-4 mb-2">
              <h2 className="text-xl font-black text-gray-500 uppercase">
                Sales history
              </h2>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl transition-all font-black shadow-lg uppercase text-[10px]"
              >
                <Download size={16} strokeWidth={3} />
                <span>Export CSV</span>
              </button>
            </div>

            {/* ช่องค้นหา */}
            <div className="mb-4 flex justify-end">
              <input
                type="text"
                placeholder="ค้นหา HN หรือ ชื่อลูกค้า..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 rounded-xl border w-full max-w-xs focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>

            {/* ตารางแสดงผล */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-6">วันที่</th>
                    <th className="p-6">HN / ชื่อลูกค้า</th>
                    <th className="p-6 text-right">Package Skin</th>
                    <th className="p-6 text-right">Product</th>
                    <th className="p-6 text-right">ค่าหัตถการ</th>
                    <th className="p-6 text-center">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {/* แก้ตรงนี้: เปลี่ยนจาก records.map เป็น currentRecords.map */}
                  {currentRecords.map((r: any) => {
                    const isExpanded = expandedRow === r.id;
                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={`hover:bg-gray-50/80 transition-all font-bold text-gray-600 cursor-pointer ${
                            isExpanded ? 'bg-gray-50' : ''
                          }`}
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : r.id)
                          }
                        >
                          <td className="p-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              {new Date(r.recordDate).toLocaleDateString(
                                'en-GB'
                              )}
                            </div>
                          </td>

                          <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-black text-gray-500">
                                  {r.hn || '-'}
                                </span>
                                <span className="text-sm font-black text-gray-800">
                                  {r.customerName || 'ไม่ระบุชื่อ'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-6 text-right text-emerald-600 font-black">
                            ฿{(r.skinPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-6 text-right text-rose-500 font-black">
                            ฿{(r.productPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-6 text-right text-blue-600 font-black">
                            ฿{(r.otherPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(r);
                                }}
                                className="text-gray-300 hover:text-blue-500 transition-colors p-2"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(r.id);
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors p-2"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ส่วนรายละเอียดที่กางออกมา */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="bg-gray-50/50 p-0 border-b border-gray-100"
                            >
                              <div className="p-6 grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Details: Package Skin */}
                                <div>
                                  <p className="text-[10px] font-black uppercase text-emerald-400 mb-3 tracking-widest">
                                    Details: Package Skin
                                  </p>
                                  {r.skinItems && r.skinItems.length > 0 ? (
                                    <div className="space-y-2">
                                      {r.skinItems.map(
                                        (item: any, i: number) => (
                                          <div
                                            key={i}
                                            className="flex justify-between text-sm bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                                          >
                                            <div>
                                              <span className="text-gray-400 font-medium block">
                                                {item.name}
                                              </span>
                                              <p className="text-[10px] text-emerald-600 font-bold">
                                                (ได้รับ {item.percent || '100'}
                                                %)
                                              </p>
                                            </div>
                                            <span className="font-black text-gray-400">
                                              ฿
                                              {Number(
                                                item.price
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic px-2">
                                      ไม่มีข้อมูลรายการ
                                    </p>
                                  )}
                                </div>

                                {/* Details: Products */}
                                <div>
                                  <p className="text-[10px] font-black uppercase text-rose-400 mb-3 tracking-widest">
                                    Details: Products
                                  </p>
                                  {r.productItems &&
                                  r.productItems.length > 0 ? (
                                    <div className="space-y-2">
                                      {r.productItems.map(
                                        (item: any, i: number) => (
                                          <div
                                            key={i}
                                            className="flex justify-between text-sm bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                                          >
                                            <span className="text-gray-400 font-medium">
                                              {item.name}
                                            </span>
                                            <span className="font-black text-gray-500">
                                              ฿
                                              {Number(
                                                item.price || 0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic px-2">
                                      ไม่มีข้อมูลรายการ
                                    </p>
                                  )}
                                </div>

                                {/* Details: ค่าคอมฯหัตถการ */}
                                <div>
                                  <p className="text-[10px] font-black uppercase text-blue-500 mb-3 tracking-widest">
                                    Details: ค่าคอมฯหัตถการ
                                  </p>
                                  {r.otherItems && r.otherItems.length > 0 ? (
                                    <div className="space-y-2">
                                      {r.otherItems.map(
                                        (item: any, i: number) => (
                                          <div
                                            key={i}
                                            className="flex justify-between items-center text-sm bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                                          >
                                            <div className="flex flex-col">
                                              <span className="text-gray-500 font-medium">
                                                {item.name}
                                              </span>
                                              {item.percent && (
                                                <span
                                                  className={`text-[10px] font-bold ${
                                                    item.percent === '100'
                                                      ? 'text-emerald-500'
                                                      : 'text-rose-400'
                                                  }`}
                                                >
                                                  {item.percent === '100'
                                                    ? `(ได้รับ ${item.percent}%)`
                                                    : `(ได้รับ ${
                                                        item.percent
                                                      }% จาก ฿${Number(
                                                        item.price
                                                      ).toLocaleString()})`}
                                                </span>
                                              )}
                                            </div>
                                            <span className="font-black text-blue-400">
                                              ฿
                                              {Number(
                                                item.calculatedPrice ||
                                                  item.price
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic px-2">
                                      ไม่มีข้อมูลรายการ
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            
            {/* --- ส่วนปุ่มเปลี่ยนหน้า (Pagination) --- */}
            <div className="flex justify-center items-center gap-4 py-6">
              <button
                onClick={() =>
                  setCurrentPage((p: number) => Math.max(p - 1, 1))
                }
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl disabled:opacity-30 font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
              >
                ก่อนหน้า
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                  Page
                </span>
                <span className="bg-pink-500 text-white px-3 py-1 rounded-lg text-sm font-black shadow-md">
                  {currentPage}
                </span>
                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                  of {totalPages}
                </span>
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p: number) => Math.min(p + 1, totalPages))
                }
                disabled={
                  currentPage === totalPages || currentRecords.length === 0
                }
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl disabled:opacity-30 font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
              {activeTab === 'employee' && (
                 <EmployeeDashboard /> 
               )}
      </div> {/* ปิด div class max-w-7xl */}
    </div>
  ); // ปิดส่วน return หลัก
} // ปิดฟังก์ชัน CosmeticSalesDashboard

// --- Helper Components (ด้านล่างนี้ไม่ต้องแก้ไขอะไร) ---
function StatCard({ label, value, color, sub, extraInfo }: any) {
  const isBlue = color === 'blue';
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden flex flex-col h-full">
      <div className="relative z-10">
        <p className="text-gray-400 text-[22px] font-black uppercase tracking-widest">
          {label}
        </p>
        <h2
          className={`text-6xl font-black mt-2 ${
            isBlue ? 'text-blue-500' : 'text-emerald-500'
          }`}
        >
          ฿{value.toLocaleString()}
        </h2>
      </div>
      {extraInfo && (
        <div className="mt-8 pt-6 border-t-2 border-gray-50 w-full">
          <p className="text-gray-400 text-[22px] font-black uppercase tracking-[0.15em] mb-2">
            {extraInfo.label}
          </p>
          <h2
            className={`text-6xl font-black mt-2 ${
              // 1. เช็คว่าเป็น 'ค่าคอมมิชชั่น' (สีเขียว)
              extraInfo.label === 'ค่าคอมมิชชั่น'
                ? 'text-emerald-500' // สีเขียวตามรูปบนสุด
                : // 2. เช็คว่าเป็น 'ค่าคอมหัตถการ' (สีชมพู)
                extraInfo.label === 'ค่าคอมหัตถการ'
                ? 'text-pink-500' // สีชมพูเดิม
                : // 3. รายการอื่นๆ เช่น ยอดขายรวม หรือ (ค่าคอมฯ + ค่าหัตถการ) (สีน้ำเงิน)
                  'text-orange-400' // สีน้ำเงินตามรูปที่ 6
            }`}
          >
            ฿{extraInfo.value.toLocaleString()}
          </h2>
        </div>
      )}
      <p className="text-[16px] text-gray-400 font-bold mt-auto pt-4 uppercase relative z-10">
        {sub}
      </p>
      <div
        className={`absolute right-[-30px] top-[-10px] opacity-5 ${
          isBlue ? 'text-blue-500' : 'text-emerald-500'
        }`}
      >
        <DollarSign size={180} />
      </div>
    </div>
  );
}

function IncentiveCard({ title, current, tiers, accentColor }: any) {
  const achievedTier = [...tiers].reverse().find((t) => current >= t.goal);
  const earnedReward = achievedTier ? achievedTier.reward : 0;
  const isProduct = accentColor === 'rose';
  const Icon = isProduct ? ShoppingBag : Sparkles;
  const iconBg = isProduct ? 'bg-rose-50' : 'bg-emerald-50';
  const iconColor = isProduct ? 'text-rose-500' : 'text-emerald-500';

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm w-full h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <h3 className="font-black text-gray-800 text-sm tracking-tight">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-400 font-bold mb-1">ยอดขายสะสม</p>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-3xl font-black text-gray-800">
          ฿{current.toLocaleString()}
        </p>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${iconBg} ${iconColor}`}
        >
          ปัจจุบันทำได้:{' '}
          {((current / tiers[tiers.length - 1].goal) * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] text-gray-400 font-bold">
          (ได้รับ ฿{earnedReward.toLocaleString()})
        </span>
      </div>
      <div className="space-y-3">
        {tiers.map((t: any, i: number) => {
          const active = current >= t.goal;
          const isNextTier =
            !active && (i === 0 || current >= tiers[i - 1].goal);
          return (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                active
                  ? 'bg-emerald-50 border-emerald-100'
                  : isNextTier
                  ? 'border-rose-200 bg-white shadow-sm'
                  : 'bg-gray-50 border-transparent opacity-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-[11px] font-black shadow-inner ${
                    active
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {t.rate}
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900">
                    เป้า ฿{t.goal.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                    รับ {t.rate} (฿{t.reward.toLocaleString()})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">
                  {active
                    ? 'สำเร็จแล้ว'
                    : `ขาด ฿${Math.max(t.goal - current, 0).toLocaleString()}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ProgressBar({ label, current, goal }: any) {
  const percent = Math.min((current / goal) * 100, 100);
  const Icon = label.toLowerCase().includes('product') ? Package : Activity;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-black uppercase mb-2 opacity-80 items-center gap-2">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span>
            {label} (เป้าหมาย ฿{goal.toLocaleString()}) & (ยอดปัจจุบัน ฿
            {current.toLocaleString()})
          </span>
        </div>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2 p-0.5">
        <div
          className="bg-white h-full rounded-full transition-all duration-1000"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function handleChangeTab(arg0: string) {
  throw new Error('Function not implemented.');
}
