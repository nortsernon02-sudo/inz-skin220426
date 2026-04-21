import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "xxx",
  projectId: "xxx",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateUsers() {
  const snapshot = await getDocs(collection(db, "authorized_users"));

  for (const d of snapshot.docs) {
    const data = d.data();

    // ถ้ายังไม่มี field นี้ → ค่อยเพิ่ม
    if (data.showInRanking === undefined) {
      await updateDoc(doc(db, "authorized_users", d.id), {
        showInRanking: true
      });

      console.log("updated:", d.id);
    }
  }

  console.log("DONE");
}

updateUsers();