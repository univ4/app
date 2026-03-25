"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MockExamTrendRecord = {
  id: number;
  exam_date: string;
  korean_grade: number | null;
  math_grade: number | null;
  english_grade: number | null;
  sci1_grade: number | null;
  sci2_grade: number | null;
};

type ChartPoint = {
  label: string;
  korean: number | null;
  math: number | null;
  english: number | null;
  scienceAverage: number | null;
};

function formatMonthLabel(examDate: string) {
  const [year, month] = examDate.split("-");
  if (!year || !month) return examDate;
  return `${year}.${month}`;
}

function toChartPoints(records: MockExamTrendRecord[]): ChartPoint[] {
  return [...records]
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    .map((record) => {
      const sciGrades = [record.sci1_grade, record.sci2_grade].filter(
        (value): value is number => typeof value === "number",
      );
      const scienceAverage =
        sciGrades.length > 0
          ? Number((sciGrades.reduce((sum, value) => sum + value, 0) / sciGrades.length).toFixed(2))
          : null;

      return {
        label: formatMonthLabel(record.exam_date),
        korean: record.korean_grade,
        math: record.math_grade,
        english: record.english_grade,
        scienceAverage,
      };
    });
}

export function ScoreTrendChart({ records }: { records: MockExamTrendRecord[] }) {
  if (!records.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>모의고사 성적 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">아직 입력된 모의고사 성적이 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const data = toChartPoints(records);

  return (
    <Card>
      <CardHeader>
        <CardTitle>모의고사 성적 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="label" />
              <YAxis type="number" domain={[1, 9]} reversed />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="korean" name="국어" stroke="#2563eb" dot />
              <Line type="monotone" dataKey="math" name="수학" stroke="#dc2626" dot />
              <Line type="monotone" dataKey="english" name="영어" stroke="#16a34a" dot />
              <Line
                type="monotone"
                dataKey="scienceAverage"
                name="과탐평균"
                stroke="#f97316"
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
