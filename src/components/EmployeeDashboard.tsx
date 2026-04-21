import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);

export default function EmployeeDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 🔥 ดึง employees
  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, 'authorized_users'));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(data);
    };
    fetchEmployees();
  }, []);

  // 🔥 ดึง sales_records
  useEffect(() => {
    const fetchRecords = async () => {
      const snapshot = await getDocs(collection(db, 'sales_records'));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecords(data);
    };
    fetchRecords();
  }, []);

  // 🔍 filter เดือน
  const filteredRecords = useMemo(() => {
    return records.filter(
      (r: any) =>
        r.recordDate && r.recordDate.startsWith(selectedMonth)
    );
  }, [records, selectedMonth]);

  // 🔥 ฟังก์ชัน Tier (เหมือน Dashboard)
  const calculateTier = (skin: number) => {
    if (skin >= 500000) return 5000;
    if (skin >= 200000) return 2000;
    if (skin >= 50000) return 750;
    return 0;
  };

  // 📊 summary + ranking
    const employeeSummary = useMemo(() => {
    const summary = employees
      .filter((emp) => emp.showInRanking !== false) // ✅ เพิ่มบรรทัดนี้
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

        // ✅ แก้ไขตรงนี้: ตรวจสอบว่าถ้ามี otherItems ให้ใช้จาก items ถ้าไม่มีค่อยใช้ otherPrice
        if (r.otherItems && Array.isArray(r.otherItems) && r.otherItems.length > 0) {
          r.otherItems.forEach((item: any) => {
            // ใช้ค่าที่คำนวณแล้ว (calculatedPrice) ถ้าไม่มีให้ใช้ราคาตั้งต้น (price)
            totalOther += Number(item.calculatedPrice !== undefined ? item.calculatedPrice : item.price) || 0;
          });
        } else {
          // ถ้าไม่มี items ย่อย ให้บวกจากยอดรวมก้อนเดียว (กันยอดหาย)
          totalOther += Number(r.otherPrice) || 0;
        }
      });

      const totalSales = totalSkin + totalProduct + totalOther;

     // ✅ 1. ยอดขายรวม (Skin + Product) = 103,755
     const totalSalesForDisplay = totalSkin + totalProduct;

     // ✅ 2. คำนวณ Incentive แยกตามที่นนท์บอก
     // Skin Package (เป้า 50k ได้ 750)
     const skinIncentive = totalSkin >= 50000 ? 750 : 0; 
     // Products (เป้า 50k ได้ 1,000)
     const productIncentive = totalProduct >= 50000 ? 1000 : 0; 

     // ✅ 3. รวมเป็น "ค่าคอมมิชชั่น" (1,750)
     const totalCommission = skinIncentive + productIncentive;

     // ✅ 4. รายได้รวมจริง (ค่าคอมฯ 1,750 + หัตถการ 1,000) = 2,750
     const totalIncome = totalCommission + totalOther;

     return {
       id: emp.id,
       name: emp.name || emp.id,
       skinSales: totalSkin,      // Incentive: Skin Package
       product: totalProduct, // Incentive: Products
       commission: totalCommission, // ค่าคอมมิชชั่น 1,750
       procedure: totalOther,       // 1,000 ค่าคอมหัตถการ
       totalSales: totalSalesForDisplay, // ยอดขายรวม 103,755
       income: totalIncome,         // (ค่าคอมฯ + ค่าหัตถการ)
     };
    });

    return summary.sort((a, b) => b.totalSales - a.totalSales);
  }, [employees, filteredRecords]);


// 🔥 กันข้อมูลยังไม่โหลด
if (employees.length === 0) {
  return <div className="text-center py-10">Loading...</div>;
}



  const topSeller = employeeSummary.length > 0 ? employeeSummary[0] : null; // ✅ กัน Error ถ้ายังไม่มีข้อมูล

// 🔥 หา user ที่ login (ใช้ id ที่ตรงกับ Firestore)
const currentUser = employees.find(
  (u) => String(u.id) === String(localStorage.getItem('employeeId'))
);
console.log('currentUser:', currentUser);
console.log('employees:', employees);
console.log('localStorage employeeId:', localStorage.getItem('employeeId'));


// ❌ ถ้าไม่ใช่ admin → ห้ามเข้า
if (!currentUser || currentUser.role?.trim().toLowerCase() !== 'admin') {
  return (
    <div className="text-center text-red-500 font-bold py-10">
      ❌ คุณไม่มีสิทธิ์เข้าหน้านี้
    </div>
  );
}
  

  return (
    <div className="space-y-6">
      {/* 🔍 filter เดือน */}
      <div className="bg-white p-4 rounded-2xl shadow w-fit">
        <input
          className="border-none focus:ring-0 font-bold text-gray-600" // เพิ่ม style ให้สวยขึ้น
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* 🥇 top seller (จะแสดงก็ต่อเมื่อมีข้อมูลแล้ว) */}
      {topSeller && topSeller.totalSales > 0 && ( 
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 p-5 rounded-2xl shadow border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-2xl">🥇</span>
             <h2 className="font-black text-lg text-yellow-800">Top Seller of the Month</h2>
          </div>
          <div className="text-2xl font-black text-gray-800">{topSeller.name}</div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xl text-gray-500 uppercase font-bold">ยอดขายรวม Products + Skin Package</p>
              <p className="text-lg font-black text-gray-700">฿{topSeller.totalSales.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xl text-gray-500 uppercase font-bold">ค่าคอมมิชชั่น+ค่าคอมหัตถการ</p>
              <p className="text-lg font-black text-green-600">฿{topSeller.income.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* 📊 ranking */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-xs">
              <th className="p-4">อันดับ</th>
              <th className="p-4">ชื่อ</th>
              <th className="p-4 text-right">Product ที่ขายได้</th>
              <th className="p-4 text-right">Skin Package ที่ขายได้</th>
              <th className="p-4 text-right">ค่าคอมมิชชั่น</th>
              <th className="p-4 text-right">ค่าคอมหัตถการ</th>
              <th className="p-4 text-right">ค่าคอมมิชชั่น+ค่าคอมหัตถการ</th>
              <th className="p-4 text-right">ยอดขายรวมทั้งหมด</th>
            </tr>
          </thead>

          <tbody>
            {employeeSummary.map((emp, i) => (
              <React.Fragment key={emp.id}>
                <tr
                  onClick={() =>
                    setExpandedId(expandedId === emp.id ? null : emp.id)
                  }
                  className={`border-t cursor-pointer ${
                    i === 0 ? 'bg-green-50 font-bold' : ''
                  }`}
                >
                  <td className="p-4">#{i + 1}</td>
                  <td className="p-4">{emp.name}</td>

                  <td className="p-4 text-right text-rose-500">
                    ฿{emp.product.toLocaleString()}
                  </td>

                  <td className="p-4 text-right text-cyan-600 font-bold">
                     ฿{emp.skinSales.toLocaleString()}
                  </td>

                  <td className="p-4 text-right text-emerald-500">
                    ฿{emp.commission.toLocaleString()}
                  </td>

                  <td className="p-4 text-right text-blue-500">
                    ฿{emp.procedure.toLocaleString()}
                  </td>

                  <td className="p-4 text-right text-green-600 font-bold">
                    ฿{emp.income.toLocaleString()}
                  </td>

                  <td className="p-4 text-right font-black">
                    ฿{emp.totalSales.toLocaleString()}
                  </td>
                </tr>

                {expandedId === emp.id && (
                  <tr>
                    <td colSpan={8} className="bg-gray-50 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-bold text-gray-500">💰 ค่าคอมมิชชั่น</p>
                          <p>฿{emp.commission.toLocaleString()}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-500">🏥 ค่าคอมหัตถการ</p>
                          <p>฿{emp.procedure.toLocaleString()}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-500">📦 Product ที่ขายได้</p>
                          <p>฿{emp.product.toLocaleString()}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-500">📦 Skin Package ที่ขายได้</p>
                          <p>฿{emp.skinSales.toLocaleString()}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-500">🔥 ค่าคอมมิชชั่น+ค่าคอมหัตถการ ที่ได้รับ</p>
                          <p className="text-green-600 font-bold">
                            ฿{emp.income.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}