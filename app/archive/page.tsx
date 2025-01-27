"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";

// ---- 追加した型 ----
interface ArchiveReagent {
  productNumber: string;
  name: string;
}

interface ArchiveHistory {
  id: string;
  productNumber: string;
  lotNumber: string;
  actionType: string;
  date: Timestamp; // Firestore Timestamp
}

export default function ArchivePage() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  // any[] → ArchiveHistory[], ArchiveReagent[]
  const [histories, setHistories] = useState<ArchiveHistory[]>([]);
  const [reagents, setReagents] = useState<ArchiveReagent[]>([]);

  const [selectedReagent, setSelectedReagent] = useState("");

  // 初期ロード時に試薬リストを取得
  useEffect(() => {
    const fetchReagents = async () => {
      const reagentsRef = collection(db, "reagents");
      const snapshot = await getDocs(reagentsRef);
      const list: ArchiveReagent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { name?: string };
        list.push({
          productNumber: docSnap.id,
          name: data.name ?? "",
        });
      });
      setReagents(list);
    };
    fetchReagents();
  }, []);

  const handleSearch = async () => {
    const historiesRef = collection(db, "histories");
    const qHistories = query(historiesRef, orderBy("date"));
    const snapshot = await getDocs(qHistories);

    const list: ArchiveHistory[] = [];
    snapshot.forEach((docSnap) => {
      // Firestoreドキュメントの型
      const data = docSnap.data() as {
        productNumber: string;
        lotNumber: string;
        actionType: string;
        date?: Timestamp; // Timestamp型を想定
      };

      if (data.date) {
        const dateObj = data.date.toDate();
        const iso = dateObj.toISOString().split("T")[0];
        if (iso >= startDate && iso <= endDate) {
          // 試薬を選択していればフィルタリング
          if (selectedReagent && data.productNumber !== selectedReagent) {
            return;
          }
          list.push({
            id: docSnap.id,
            productNumber: data.productNumber,
            lotNumber: data.lotNumber,
            actionType: data.actionType,
            date: data.date, // Timestamp
          });
        }
      }
    });
    setHistories(list);
  };

  const handleDelete = async (id: string) => {
    const docRef = doc(db, "histories", id);
    await deleteDoc(docRef);
    setHistories((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">アーカイブ</h1>
      <div className="flex space-x-2 items-end mb-4">
        <div>
          <label className="block mb-1">開始日</label>
          <input
            type="date"
            className="border px-2 py-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">終了日</label>
          <input
            type="date"
            className="border px-2 py-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">試薬名</label>
          <select
            className="border px-2 py-1"
            value={selectedReagent}
            onChange={(e) => setSelectedReagent(e.target.value)}
          >
            <option value="">すべて</option>
            {reagents.map((r) => (
              <option key={r.productNumber} value={r.productNumber}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-3 py-1"
        >
          抽出
        </button>
      </div>

      <table className="border w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">日付</th>
            <th className="border p-2">ロットナンバー</th>
            <th className="border p-2">入庫 or 出庫</th>
            <th className="border p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {histories.map((h) => {
            // h.date は Timestamp 型
            const dateStr = h.date.toDate().toLocaleString();
            return (
              <tr key={h.id}>
                <td className="border p-2">{dateStr}</td>
                <td className="border p-2">{h.lotNumber}</td>
                <td className="border p-2">
                  {h.actionType === "inbound" ? "入庫" : "出庫"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="bg-red-600 text-white px-3 py-1"
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
