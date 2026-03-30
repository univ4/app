"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  EarlyRoadmapDept,
  EarlyRoadmapGrade,
  EarlyRoadmapSemester,
  EarlyRoadmapUnivType,
} from "@/lib/calculators/calcEarlyRoadmap";

export interface RoadmapSetupValues {
  currentGrade: EarlyRoadmapGrade;
  currentSemester: EarlyRoadmapSemester;
  targetUnivType: EarlyRoadmapUnivType;
  targetDept: EarlyRoadmapDept;
}

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export const roadmapSetupDefaults: RoadmapSetupValues = {
  currentGrade: 1,
  currentSemester: 1,
  targetUnivType: "mid",
  targetDept: "science",
};

export interface RoadmapSetupProps {
  values: RoadmapSetupValues;
  onChange: (next: RoadmapSetupValues) => void;
  onApply: () => void;
  loading: boolean;
}

export function RoadmapSetup({ values, onChange, onApply, loading }: RoadmapSetupProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="roadmap-grade">현재 학년</Label>
        <select
          id="roadmap-grade"
          className={selectClass}
          value={values.currentGrade}
          onChange={(e) =>
            onChange({
              ...values,
              currentGrade: Number(e.target.value) as EarlyRoadmapGrade,
            })
          }
        >
          <option value={1}>고1</option>
          <option value={2}>고2</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="roadmap-sem">현재 학기</Label>
        <select
          id="roadmap-sem"
          className={selectClass}
          value={values.currentSemester}
          onChange={(e) =>
            onChange({
              ...values,
              currentSemester: Number(e.target.value) as EarlyRoadmapSemester,
            })
          }
        >
          <option value={1}>1학기</option>
          <option value={2}>2학기</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="roadmap-univ">목표 대학 수준</Label>
        <select
          id="roadmap-univ"
          className={selectClass}
          value={values.targetUnivType}
          onChange={(e) =>
            onChange({
              ...values,
              targetUnivType: e.target.value as EarlyRoadmapUnivType,
            })
          }
        >
          <option value="top">상위권 (SKY+)</option>
          <option value="mid">중상위권</option>
          <option value="local">지역 거점</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="roadmap-dept">목표 계열</Label>
        <select
          id="roadmap-dept"
          className={selectClass}
          value={values.targetDept}
          onChange={(e) =>
            onChange({
              ...values,
              targetDept: e.target.value as EarlyRoadmapDept,
            })
          }
        >
          <option value="science">이공계</option>
          <option value="liberal">인문·사회</option>
          <option value="art">예체능</option>
        </select>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <Button type="button" className="w-full sm:w-auto" onClick={onApply} disabled={loading}>
          {loading ? "불러오는 중…" : "로드맵 적용"}
        </Button>
      </div>
    </div>
  );
}
