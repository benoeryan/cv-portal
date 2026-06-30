"use client";
import { useState, useEffect } from "react";

/**
 * JapaneseDatePicker - A date picker that stores dates in Japanese format (YYYY年MM月DD日)
 * 
 * It displays separate year/month/day select dropdowns for easy selection,
 * and converts the selected date to/from Japanese format for storage.
 */

// Parse Japanese date format "2026年06月05日" or "2026/06/05" to { year, month, day }
function parseDateValue(value) {
  if (!value) return { year: "", month: "", day: "" };

  // Try Japanese format: 2026年06月05日
  const jpMatch = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (jpMatch) {
    return { year: jpMatch[1], month: jpMatch[2], day: jpMatch[3] };
  }

  // Try slash format: 2026/06/05
  const slashMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    return { year: slashMatch[1], month: slashMatch[2], day: slashMatch[3] };
  }

  // Try dash format: 2026-06-05
  const dashMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    return { year: dashMatch[1], month: dashMatch[2], day: dashMatch[3] };
  }

  return { year: "", month: "", day: "" };
}

// Format to Japanese date: 2026年06月05日
function toJapaneseDate(year, month, day) {
  if (!year || !month || !day) return "";
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}年${mm}月${dd}日`;
}

export default function JapaneseDatePicker({ value, onChange, className = "" }) {
  const parsed = parseDateValue(value);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  // Sync internal state when external value changes
  useEffect(() => {
    const parsed = parseDateValue(value);
    setYear(parsed.year);
    setMonth(parsed.month);
    setDay(parsed.day);
  }, [value]);

  const handleUpdate = (newYear, newMonth, newDay) => {
    if (newYear && newMonth && newDay) {
      const formatted = toJapaneseDate(newYear, newMonth, newDay);
      onChange(formatted);
    } else if (!newYear && !newMonth && !newDay) {
      // All cleared
      onChange("");
    }
  };

  const handleYearChange = (e) => {
    const v = e.target.value;
    setYear(v);
    handleUpdate(v, month, day);
  };

  const handleMonthChange = (e) => {
    const v = e.target.value;
    setMonth(v);
    handleUpdate(year, v, day);
  };

  const handleDayChange = (e) => {
    const v = e.target.value;
    setDay(v);
    handleUpdate(year, month, v);
  };

  // Generate year options (2015 to 2035)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 10; y <= currentYear + 10; y++) {
    years.push(y);
  }

  // Generate day options based on month/year
  const daysInMonth = (year && month) ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Year Select */}
      <select
        value={year}
        onChange={handleYearChange}
        className="input-field py-1.5 px-2 text-sm w-[90px]"
      >
        <option value="">Tahun</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <span className="text-gray-500 text-sm">年</span>

      {/* Month Select */}
      <select
        value={month ? String(Number(month)) : ""}
        onChange={handleMonthChange}
        className="input-field py-1.5 px-2 text-sm w-[75px]"
      >
        <option value="">Bulan</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <span className="text-gray-500 text-sm">月</span>

      {/* Day Select */}
      <select
        value={day ? String(Number(day)) : ""}
        onChange={handleDayChange}
        className="input-field py-1.5 px-2 text-sm w-[75px]"
      >
        <option value="">Hari</option>
        {days.map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, "0")}</option>
        ))}
      </select>
      <span className="text-gray-500 text-sm">日</span>

      {/* Display the formatted value */}
      {value && (
        <span className="text-xs text-green-600 ml-2 font-mono">{value}</span>
      )}
    </div>
  );
}
