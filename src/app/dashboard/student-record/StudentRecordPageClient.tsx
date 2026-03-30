"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_RECORD_TEXT } from "@/lib/student-record/studentRecordZod";
import { cn } from "@/lib/utils";

type SubjectNote = {
  id: string;
  grade: number;
  semester: number;
  subject_name: string;
  note: string;
};

type ActivityKind = "자율활동" | "동아리활동" | "진로활동";

type ActivityRow = {
  id: string;
  grade: number;
  activity_type: ActivityKind;
  hours: number | null;
  hope_field: string | null;
  content: string;
};

type AwardRow = {
  id: string;
  grade: number;
  semester: number;
  award_name: string;
  rank: string | null;
  award_date: string | null;
  organization: string | null;
  participants: string | null;
};

type BehaviorRow = {
  id: string;
  grade: number;
  content: string;
};

export type AttendanceRow = {
  id: string;
  grade: number;
  school_days: number | null;
  absence_illness: number;
  absence_unauthorized: number;
  absence_other: number;
  late_illness: number;
  late_unauthorized: number;
  late_other: number;
  early_leave_illness: number;
  early_leave_unauthorized: number;
  early_leave_other: number;
  result_illness: number;
  result_unauthorized: number;
  result_other: number;
  note: string | null;
};

export type VolunteerRow = {
  id: string;
  grade: number;
  period: string;
  organization: string;
  activity: string;
  hours: number;
  cumulative_hours: number | null;
};

export type ReadingRow = {
  id: string;
  grade: number;
  subject_area: string | null;
  content: string | null;
};

export type CertificateRow = {
  id: string;
  cert_type: string;
  cert_name: string;
  cert_number: string | null;
  acquired_date: string | null;
  issuer: string | null;
  created_at: string;
};

export type SchoolViolenceRow = {
  id: string;
  grade: number;
  decision_date: string;
  action_detail: string;
  created_at: string;
};

type AttendanceFormFields = {
  school_days: string;
  absence_illness: string;
  absence_unauthorized: string;
  absence_other: string;
  late_illness: string;
  late_unauthorized: string;
  late_other: string;
  early_leave_illness: string;
  early_leave_unauthorized: string;
  early_leave_other: string;
  result_illness: string;
  result_unauthorized: string;
  result_other: string;
  note: string;
};

function emptyAttendanceForm(): AttendanceFormFields {
  return {
    school_days: "",
    absence_illness: "0",
    absence_unauthorized: "0",
    absence_other: "0",
    late_illness: "0",
    late_unauthorized: "0",
    late_other: "0",
    early_leave_illness: "0",
    early_leave_unauthorized: "0",
    early_leave_other: "0",
    result_illness: "0",
    result_unauthorized: "0",
    result_other: "0",
    note: "",
  };
}

function attendanceRowToForm(r: AttendanceRow): AttendanceFormFields {
  return {
    school_days: r.school_days != null ? String(r.school_days) : "",
    absence_illness: String(r.absence_illness ?? 0),
    absence_unauthorized: String(r.absence_unauthorized ?? 0),
    absence_other: String(r.absence_other ?? 0),
    late_illness: String(r.late_illness ?? 0),
    late_unauthorized: String(r.late_unauthorized ?? 0),
    late_other: String(r.late_other ?? 0),
    early_leave_illness: String(r.early_leave_illness ?? 0),
    early_leave_unauthorized: String(r.early_leave_unauthorized ?? 0),
    early_leave_other: String(r.early_leave_other ?? 0),
    result_illness: String(r.result_illness ?? 0),
    result_unauthorized: String(r.result_unauthorized ?? 0),
    result_other: String(r.result_other ?? 0),
    note: r.note ?? "",
  };
}

function parseNonNegInt(s: string, fallback = 0): number {
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(9999, n);
}

const textareaClass = cn(
  "flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
);

const selectClass = cn(
  "min-h-11 h-11 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none sm:h-8 sm:min-h-8",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

function apiUrl(path: string, recordStudentId: string) {
  const qs = `student_id=${encodeURIComponent(recordStudentId)}`;
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
}

export function StudentRecordPageClient(props: {
  recordStudentId: string;
  isAdmin: boolean;
}) {
  const { recordStudentId, isAdmin } = props;
  const q = useCallback((p: string) => apiUrl(p, recordStudentId), [recordStudentId]);

  const [notes, setNotes] = useState<SubjectNote[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [noteForm, setNoteForm] = useState({
    grade: 1,
    semester: 1,
    subject_name: "",
    note: "",
    editingId: null as string | null,
  });

  const [actForm, setActForm] = useState({
    grade: 1,
    activity_type: "자율활동" as ActivityKind,
    hours: "" as string,
    hope_field: "",
    content: "",
    editingId: null as string | null,
  });

  const [awardForm, setAwardForm] = useState({
    grade: 1,
    semester: 1,
    award_name: "",
    rank: "",
    award_date: "",
    organization: "",
    participants: "",
    editingId: null as string | null,
  });

  const [behaviorDrafts, setBehaviorDrafts] = useState<Record<number, string>>({
    1: "",
    2: "",
    3: "",
  });

  const [attForms, setAttForms] = useState<Record<1 | 2 | 3, AttendanceFormFields>>({
    1: emptyAttendanceForm(),
    2: emptyAttendanceForm(),
    3: emptyAttendanceForm(),
  });

  const [volunteerItems, setVolunteerItems] = useState<VolunteerRow[]>([]);
  const [volForm, setVolForm] = useState({
    grade: 1,
    period: "",
    organization: "",
    activity: "",
    hours: "",
  });

  const [readingItems, setReadingItems] = useState<ReadingRow[]>([]);
  const [readForm, setReadForm] = useState({
    grade: 1,
    subject_area: "",
    content: "",
  });

  const [certItems, setCertItems] = useState<CertificateRow[]>([]);
  const [certForm, setCertForm] = useState({
    cert_type: "자격증" as "자격증" | "인증",
    cert_name: "",
    cert_number: "",
    acquired_date: "",
    issuer: "",
  });

  const [violenceItems, setViolenceItems] = useState<SchoolViolenceRow[]>([]);
  const [violenceForm, setViolenceForm] = useState({
    grade: 1,
    decision_date: "",
    action_detail: "",
  });

  const showMsg = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const loadNotes = useCallback(async () => {
    const res = await fetch(q("/api/student-record/subject-notes"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "세특을 불러오지 못했습니다.");
      return;
    }
    setNotes(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadActivities = useCallback(async () => {
    const res = await fetch(q("/api/student-record/activities"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "창체를 불러오지 못했습니다.");
      return;
    }
    setActivities(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadAwards = useCallback(async () => {
    const res = await fetch(q("/api/student-record/awards"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "수상을 불러오지 못했습니다.");
      return;
    }
    setAwards(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadBehavior = useCallback(async () => {
    const res = await fetch(q("/api/student-record/behavior"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "행동특성을 불러오지 못했습니다.");
      return;
    }
    const items: BehaviorRow[] = json.data?.items ?? [];
    setBehaviors(items);
    const next = { 1: "", 2: "", 3: "" };
    for (const g of [1, 2, 3] as const) {
      const row = items.find((r) => r.grade === g);
      next[g] = row?.content ?? "";
    }
    setBehaviorDrafts(next);
  }, [q, showMsg]);

  const loadAttendance = useCallback(async () => {
    const res = await fetch(q("/api/student-record/attendance"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "출결을 불러오지 못했습니다.");
      return;
    }
    const items: AttendanceRow[] = json.data?.items ?? [];
    const next: Record<1 | 2 | 3, AttendanceFormFields> = {
      1: emptyAttendanceForm(),
      2: emptyAttendanceForm(),
      3: emptyAttendanceForm(),
    };
    for (const r of items) {
      const g = r.grade as 1 | 2 | 3;
      if (g === 1 || g === 2 || g === 3) {
        next[g] = attendanceRowToForm(r);
      }
    }
    setAttForms(next);
  }, [q, showMsg]);

  const loadVolunteer = useCallback(async () => {
    const res = await fetch(q("/api/student-record/volunteer"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "봉사를 불러오지 못했습니다.");
      return;
    }
    setVolunteerItems(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadReading = useCallback(async () => {
    const res = await fetch(q("/api/student-record/reading"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "독서를 불러오지 못했습니다.");
      return;
    }
    setReadingItems(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadCertificates = useCallback(async () => {
    const res = await fetch(q("/api/student-record/certificates"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "자격증을 불러오지 못했습니다.");
      return;
    }
    setCertItems(json.data?.items ?? []);
  }, [q, showMsg]);

  const loadSchoolViolence = useCallback(async () => {
    const res = await fetch(q("/api/student-record/school-violence"));
    const json = await res.json();
    if (!res.ok) {
      showMsg(json.error?.message ?? "학교폭력 기록을 불러오지 못했습니다.");
      return;
    }
    setViolenceItems(json.data?.items ?? []);
  }, [q, showMsg]);

  useEffect(() => {
    void loadNotes();
    void loadActivities();
    void loadAwards();
    void loadBehavior();
    void loadAttendance();
    void loadVolunteer();
    void loadReading();
    void loadCertificates();
    void loadSchoolViolence();
  }, [
    loadNotes,
    loadActivities,
    loadAwards,
    loadBehavior,
    loadAttendance,
    loadVolunteer,
    loadReading,
    loadCertificates,
    loadSchoolViolence,
  ]);

  const notesByTerm = useMemo(() => {
    const map = new Map<string, SubjectNote[]>();
    for (const n of notes) {
      const key = `${n.grade}학년 ${n.semester}학기`;
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [notes]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    setLoading("note");
    try {
      const trimmed = noteForm.note.trim();
      if (!noteForm.subject_name.trim() || !trimmed) {
        showMsg("과목명과 내용을 입력하세요.");
        return;
      }
      if (trimmed.length > MAX_RECORD_TEXT) {
        showMsg(`내용은 ${MAX_RECORD_TEXT}자 이하로 입력하세요.`);
        return;
      }
      const body = {
        grade: noteForm.grade,
        semester: noteForm.semester,
        subject_name: noteForm.subject_name.trim(),
        note: trimmed,
      };
      if (noteForm.editingId) {
        const res = await fetch(
          q(`/api/student-record/subject-notes/${noteForm.editingId}`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "수정에 실패했습니다.");
          return;
        }
        showMsg("세특이 수정되었습니다.");
      } else {
        const res = await fetch(q("/api/student-record/subject-notes"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "저장에 실패했습니다.");
          return;
        }
        showMsg("세특이 추가되었습니다.");
      }
      setNoteForm({
        grade: 1,
        semester: 1,
        subject_name: "",
        note: "",
        editingId: null,
      });
      await loadNotes();
    } finally {
      setLoading(null);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("이 세특을 삭제할까요?")) return;
    setLoading("note");
    try {
      const res = await fetch(q(`/api/student-record/subject-notes/${id}`), {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      if (noteForm.editingId === id) {
        setNoteForm((f) => ({ ...f, editingId: null, subject_name: "", note: "" }));
      }
      await loadNotes();
    } finally {
      setLoading(null);
    }
  }

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    setLoading("act");
    try {
      const trimmed = actForm.content.trim();
      if (!trimmed || trimmed.length > MAX_RECORD_TEXT) {
        showMsg(`내용을 ${MAX_RECORD_TEXT}자 이하로 입력하세요.`);
        return;
      }
      const hours =
        actForm.hours === "" ? null : Math.min(9999, Math.max(0, parseInt(actForm.hours, 10) || 0));
      const body: Record<string, unknown> = {
        grade: actForm.grade,
        activity_type: actForm.activity_type,
        hours,
        content: trimmed,
      };
      if (actForm.activity_type === "진로활동") {
        body.hope_field = actForm.hope_field.trim() || null;
      }
      if (actForm.editingId) {
        const res = await fetch(
          q(`/api/student-record/activities/${actForm.editingId}`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "수정에 실패했습니다.");
          return;
        }
        showMsg("창체가 수정되었습니다.");
      } else {
        const res = await fetch(q("/api/student-record/activities"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "저장에 실패했습니다.");
          return;
        }
        showMsg("창체가 추가되었습니다.");
      }
      setActForm({
        grade: 1,
        activity_type: "자율활동",
        hours: "",
        hope_field: "",
        content: "",
        editingId: null,
      });
      await loadActivities();
    } finally {
      setLoading(null);
    }
  }

  async function deleteActivity(id: string) {
    if (!confirm("이 창체 행을 삭제할까요?")) return;
    setLoading("act");
    try {
      const res = await fetch(q(`/api/student-record/activities/${id}`), {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadActivities();
    } finally {
      setLoading(null);
    }
  }

  async function submitAward(e: React.FormEvent) {
    e.preventDefault();
    setLoading("award");
    try {
      if (!awardForm.award_name.trim()) {
        showMsg("수상명을 입력하세요.");
        return;
      }
      const body: Record<string, unknown> = {
        grade: awardForm.grade,
        semester: awardForm.semester,
        award_name: awardForm.award_name.trim(),
        rank: awardForm.rank.trim() || null,
        organization: awardForm.organization.trim() || null,
        participants: awardForm.participants.trim() || null,
        award_date: awardForm.award_date.trim() || null,
      };
      if (awardForm.editingId) {
        const res = await fetch(
          q(`/api/student-record/awards/${awardForm.editingId}`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "수정에 실패했습니다.");
          return;
        }
        showMsg("수상이 수정되었습니다.");
      } else {
        const res = await fetch(q("/api/student-record/awards"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          showMsg(json.error?.message ?? "저장에 실패했습니다.");
          return;
        }
        showMsg("수상이 추가되었습니다.");
      }
      setAwardForm({
        grade: 1,
        semester: 1,
        award_name: "",
        rank: "",
        award_date: "",
        organization: "",
        participants: "",
        editingId: null,
      });
      await loadAwards();
    } finally {
      setLoading(null);
    }
  }

  async function deleteAward(id: string) {
    if (!confirm("이 수상을 삭제할까요?")) return;
    setLoading("award");
    try {
      const res = await fetch(q(`/api/student-record/awards/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadAwards();
    } finally {
      setLoading(null);
    }
  }

  async function saveBehavior(grade: number) {
    setLoading(`beh-${grade}`);
    try {
      const content = behaviorDrafts[grade]?.trim() ?? "";
      if (!content || content.length > MAX_RECORD_TEXT) {
        showMsg(`${grade}학년: 내용을 1~${MAX_RECORD_TEXT}자로 입력하세요.`);
        return;
      }
      const res = await fetch(q("/api/student-record/behavior"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, content }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "저장에 실패했습니다.");
        return;
      }
      showMsg(`${grade}학년 행동특성이 저장되었습니다.`);
      await loadBehavior();
    } finally {
      setLoading(null);
    }
  }

  async function saveAttendanceGrade(grade: 1 | 2 | 3) {
    if (!isAdmin) return;
    setLoading(`att-${grade}`);
    try {
      const f = attForms[grade];
      const schoolDaysRaw = f.school_days.trim();
      const school_days =
        schoolDaysRaw === "" ? null : Math.min(366, Math.max(0, parseInt(schoolDaysRaw, 10) || 0));
      const body = {
        grade,
        school_days,
        absence_illness: parseNonNegInt(f.absence_illness),
        absence_unauthorized: parseNonNegInt(f.absence_unauthorized),
        absence_other: parseNonNegInt(f.absence_other),
        late_illness: parseNonNegInt(f.late_illness),
        late_unauthorized: parseNonNegInt(f.late_unauthorized),
        late_other: parseNonNegInt(f.late_other),
        early_leave_illness: parseNonNegInt(f.early_leave_illness),
        early_leave_unauthorized: parseNonNegInt(f.early_leave_unauthorized),
        early_leave_other: parseNonNegInt(f.early_leave_other),
        result_illness: parseNonNegInt(f.result_illness),
        result_unauthorized: parseNonNegInt(f.result_unauthorized),
        result_other: parseNonNegInt(f.result_other),
        note: f.note.trim() === "" ? null : f.note.trim(),
      };
      const res = await fetch(q("/api/student-record/attendance"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "출결 저장에 실패했습니다.");
        return;
      }
      showMsg(`${grade}학년 출결이 저장되었습니다.`);
      await loadAttendance();
    } finally {
      setLoading(null);
    }
  }

  async function submitVolunteer(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading("vol");
    try {
      if (!volForm.period.trim() || !volForm.organization.trim() || !volForm.activity.trim()) {
        showMsg("일자·기간, 장소·기관, 활동내용을 입력하세요.");
        return;
      }
      const hours = Math.min(99999, Math.max(0, parseInt(volForm.hours, 10) || 0));
      const res = await fetch(q("/api/student-record/volunteer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: volForm.grade,
          period: volForm.period.trim(),
          organization: volForm.organization.trim(),
          activity: volForm.activity.trim(),
          hours,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "봉사 추가에 실패했습니다.");
        return;
      }
      showMsg("봉사 실적이 추가되었습니다.");
      setVolForm({ grade: 1, period: "", organization: "", activity: "", hours: "" });
      await loadVolunteer();
    } finally {
      setLoading(null);
    }
  }

  async function deleteVolunteer(id: string) {
    if (!confirm("이 봉사 실적을 삭제할까요?")) return;
    setLoading("vol");
    try {
      const res = await fetch(q(`/api/student-record/volunteer/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadVolunteer();
    } finally {
      setLoading(null);
    }
  }

  async function submitReading(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading("read");
    try {
      const trimmed = readForm.content.trim();
      if (!trimmed || trimmed.length > MAX_RECORD_TEXT) {
        showMsg(`독서 활동 상황을 1~${MAX_RECORD_TEXT}자로 입력하세요.`);
        return;
      }
      const res = await fetch(q("/api/student-record/reading"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: readForm.grade,
          subject_area: readForm.subject_area.trim() === "" ? null : readForm.subject_area.trim(),
          content: trimmed,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "독서 추가에 실패했습니다.");
        return;
      }
      showMsg("독서 기록이 추가되었습니다.");
      setReadForm({ grade: 1, subject_area: "", content: "" });
      await loadReading();
    } finally {
      setLoading(null);
    }
  }

  async function deleteReading(id: string) {
    if (!confirm("이 독서 기록을 삭제할까요?")) return;
    setLoading("read");
    try {
      const res = await fetch(q(`/api/student-record/reading/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadReading();
    } finally {
      setLoading(null);
    }
  }

  async function submitCertificate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading("cert");
    try {
      if (!certForm.cert_name.trim()) {
        showMsg("명칭을 입력하세요.");
        return;
      }
      const res = await fetch(q("/api/student-record/certificates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cert_type: certForm.cert_type,
          cert_name: certForm.cert_name.trim(),
          cert_number: certForm.cert_number.trim() === "" ? null : certForm.cert_number.trim(),
          acquired_date: certForm.acquired_date.trim() === "" ? null : certForm.acquired_date.trim(),
          issuer: certForm.issuer.trim() === "" ? null : certForm.issuer.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "추가에 실패했습니다.");
        return;
      }
      showMsg("자격증·인증이 추가되었습니다.");
      setCertForm({
        cert_type: "자격증",
        cert_name: "",
        cert_number: "",
        acquired_date: "",
        issuer: "",
      });
      await loadCertificates();
    } finally {
      setLoading(null);
    }
  }

  async function deleteCertificate(id: string) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    setLoading("cert");
    try {
      const res = await fetch(q(`/api/student-record/certificates/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadCertificates();
    } finally {
      setLoading(null);
    }
  }

  async function submitSchoolViolence(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading("sv");
    try {
      const detail = violenceForm.action_detail.trim();
      if (!violenceForm.decision_date.trim() || !detail || detail.length > MAX_RECORD_TEXT) {
        showMsg("조치일과 조치사항(1~3000자)을 입력하세요.");
        return;
      }
      const res = await fetch(q("/api/student-record/school-violence"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: violenceForm.grade,
          decision_date: violenceForm.decision_date.trim(),
          action_detail: detail,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "추가에 실패했습니다.");
        return;
      }
      showMsg("기록이 추가되었습니다.");
      setViolenceForm({ grade: 1, decision_date: "", action_detail: "" });
      await loadSchoolViolence();
    } finally {
      setLoading(null);
    }
  }

  async function deleteSchoolViolence(id: string) {
    if (!confirm("이 조치 기록을 삭제할까요?")) return;
    setLoading("sv");
    try {
      const res = await fetch(q(`/api/student-record/school-violence/${id}`), {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg(json.error?.message ?? "삭제에 실패했습니다.");
        return;
      }
      showMsg("삭제되었습니다.");
      await loadSchoolViolence();
    } finally {
      setLoading(null);
    }
  }

  function attendanceCountGrid(
    label: string,
    illnessKey: keyof AttendanceFormFields,
    unauthKey: keyof AttendanceFormFields,
    otherKey: keyof AttendanceFormFields,
    grade: 1 | 2 | 3,
    disabled: boolean,
  ) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">{label}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">질병</Label>
            <Input
              type="number"
              min={0}
              className="mt-0.5"
              disabled={disabled}
              value={attForms[grade][illnessKey]}
              onChange={(e) =>
                setAttForms((prev) => ({
                  ...prev,
                  [grade]: { ...prev[grade], [illnessKey]: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">미인정</Label>
            <Input
              type="number"
              min={0}
              className="mt-0.5"
              disabled={disabled}
              value={attForms[grade][unauthKey]}
              onChange={(e) =>
                setAttForms((prev) => ({
                  ...prev,
                  [grade]: { ...prev[grade], [unauthKey]: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">기타</Label>
            <Input
              type="number"
              min={0}
              className="mt-0.5"
              disabled={disabled}
              value={attForms[grade][otherKey]}
              onChange={(e) =>
                setAttForms((prev) => ({
                  ...prev,
                  [grade]: { ...prev[grade], [otherKey]: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4">
      {message ? (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <Tabs defaultValue="subject" className="w-full">
        <TabsList
          variant="line"
          className="mb-2 !h-auto flex-wrap gap-1 [&_[data-slot=tabs-trigger]]:min-h-11 [&_[data-slot=tabs-trigger]]:px-3 sm:[&_[data-slot=tabs-trigger]]:min-h-0 sm:[&_[data-slot=tabs-trigger]]:px-1.5"
        >
          <TabsTrigger value="subject" data-testid="tab-세특">세특</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-창체">창체</TabsTrigger>
          <TabsTrigger value="award" data-testid="tab-수상">수상</TabsTrigger>
          <TabsTrigger value="behavior" data-testid="tab-행동특성">행동특성</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-출결">출결</TabsTrigger>
          <TabsTrigger value="volunteer" data-testid="tab-봉사">봉사</TabsTrigger>
          <TabsTrigger value="reading" data-testid="tab-독서">독서</TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-자격증">자격증</TabsTrigger>
          <TabsTrigger value="school-violence" data-testid="tab-학교폭력">학교폭력</TabsTrigger>
        </TabsList>

        <TabsContent value="subject">
          <Card>
            <CardHeader>
              <CardTitle>세부능력 및 특기사항</CardTitle>
              <CardDescription>
                학년·학기·과목별 세특 (최대 {MAX_RECORD_TEXT}자). NEIS 나이스보내기(매뉴얼 §2.3)로
                채운 뒤 여기서 보완할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitNote} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    {noteForm.editingId ? "세특 수정" : "세특 추가"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={noteForm.grade}
                        onChange={(e) =>
                          setNoteForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label>학기</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={noteForm.semester}
                        onChange={(e) =>
                          setNoteForm((f) => ({ ...f, semester: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sn-subject">과목명</Label>
                    <Input
                      id="sn-subject"
                      className="mt-1"
                      value={noteForm.subject_name}
                      onChange={(e) =>
                        setNoteForm((f) => ({ ...f, subject_name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="sn-note">내용</Label>
                    <textarea
                      id="sn-note"
                      className={cn(textareaClass, "mt-1")}
                      maxLength={MAX_RECORD_TEXT}
                      value={noteForm.note}
                      onChange={(e) => setNoteForm((f) => ({ ...f, note: e.target.value }))}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {noteForm.note.length} / {MAX_RECORD_TEXT}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading === "note"}>
                      {noteForm.editingId ? "저장" : "추가"}
                    </Button>
                    {noteForm.editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setNoteForm({
                            grade: 1,
                            semester: 1,
                            subject_name: "",
                            note: "",
                            editingId: null,
                          })
                        }
                      >
                        취소
                      </Button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다. 입력·수정은 관리자만 가능합니다.</p>
              )}

              <div className="space-y-6">
                {notesByTerm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">등록된 세특이 없습니다.</p>
                ) : (
                  notesByTerm.map(([label, rows]) => (
                    <div key={label}>
                      <h3 className="mb-2 text-sm font-semibold">{label}</h3>
                      <ul className="space-y-3">
                        {rows.map((n) => (
                          <li
                            key={n.id}
                            className="rounded-lg border bg-background p-3 text-sm"
                          >
                            <div className="mb-1 font-medium">{n.subject_name}</div>
                            <p className="whitespace-pre-wrap text-muted-foreground">{n.note}</p>
                            {isAdmin ? (
                              <div className="mt-2 flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setNoteForm({
                                      grade: n.grade,
                                      semester: n.semester,
                                      subject_name: n.subject_name,
                                      note: n.note,
                                      editingId: n.id,
                                    })
                                  }
                                >
                                  수정
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void deleteNote(n.id)}
                                >
                                  삭제
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>창의적 체험활동</CardTitle>
              <CardDescription>
                학년×영역(자율·동아리·진로)당 1행. 진로활동만 희망분야 입력.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitActivity} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    {actForm.editingId ? "창체 수정" : "창체 추가"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={actForm.grade}
                        onChange={(e) =>
                          setActForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label>영역</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={actForm.activity_type}
                        onChange={(e) =>
                          setActForm((f) => ({
                            ...f,
                            activity_type: e.target.value as ActivityKind,
                          }))
                        }
                      >
                        <option value="자율활동">자율활동</option>
                        <option value="동아리활동">동아리활동</option>
                        <option value="진로활동">진로활동</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="act-hours">시간 (시간 단위, 선택)</Label>
                    <Input
                      id="act-hours"
                      type="number"
                      min={0}
                      className="mt-1 max-w-[120px]"
                      value={actForm.hours}
                      onChange={(e) => setActForm((f) => ({ ...f, hours: e.target.value }))}
                    />
                  </div>
                  {actForm.activity_type === "진로활동" ? (
                    <div>
                      <Label htmlFor="act-hope">희망분야</Label>
                      <Input
                        id="act-hope"
                        className="mt-1"
                        value={actForm.hope_field}
                        onChange={(e) =>
                          setActForm((f) => ({ ...f, hope_field: e.target.value }))
                        }
                      />
                    </div>
                  ) : null}
                  <div>
                    <Label htmlFor="act-content">특기사항</Label>
                    <textarea
                      id="act-content"
                      className={cn(textareaClass, "mt-1")}
                      maxLength={MAX_RECORD_TEXT}
                      value={actForm.content}
                      onChange={(e) =>
                        setActForm((f) => ({ ...f, content: e.target.value }))
                      }
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {actForm.content.length} / {MAX_RECORD_TEXT}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading === "act"}>
                      {actForm.editingId ? "저장" : "추가"}
                    </Button>
                    {actForm.editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setActForm({
                            grade: 1,
                            activity_type: "자율활동",
                            hours: "",
                            hope_field: "",
                            content: "",
                            editingId: null,
                          })
                        }
                      >
                        취소
                      </Button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}

              <ul className="space-y-3">
                {activities.length === 0 ? (
                  <li className="text-sm text-muted-foreground">등록된 창체가 없습니다.</li>
                ) : (
                  activities.map((a) => (
                    <li key={a.id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">
                        {a.grade}학년 · {a.activity_type}
                        {a.hours != null ? ` · ${a.hours}시간` : ""}
                      </div>
                      {a.hope_field ? (
                        <div className="text-muted-foreground">희망분야: {a.hope_field}</div>
                      ) : null}
                      <p className="mt-2 whitespace-pre-wrap">{a.content}</p>
                      {isAdmin ? (
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActForm({
                                grade: a.grade,
                                activity_type: a.activity_type,
                                hours: a.hours != null ? String(a.hours) : "",
                                hope_field: a.hope_field ?? "",
                                content: a.content,
                                editingId: a.id,
                              })
                            }
                          >
                            수정
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteActivity(a.id)}
                          >
                            삭제
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="award">
          <Card>
            <CardHeader>
              <CardTitle>수상경력</CardTitle>
              <CardDescription>학년·학기·수상명·등급(위)·일자·기관</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitAward} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    {awardForm.editingId ? "수상 수정" : "수상 추가"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={awardForm.grade}
                        onChange={(e) =>
                          setAwardForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label>학기</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={awardForm.semester}
                        onChange={(e) =>
                          setAwardForm((f) => ({ ...f, semester: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="aw-name">수상명</Label>
                    <Input
                      id="aw-name"
                      className="mt-1"
                      value={awardForm.award_name}
                      onChange={(e) =>
                        setAwardForm((f) => ({ ...f, award_name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="aw-rank">등급(위)</Label>
                    <Input
                      id="aw-rank"
                      className="mt-1"
                      value={awardForm.rank}
                      onChange={(e) => setAwardForm((f) => ({ ...f, rank: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="aw-date">수상연월일</Label>
                    <Input
                      id="aw-date"
                      type="date"
                      className="mt-1 max-w-[200px]"
                      value={awardForm.award_date}
                      onChange={(e) =>
                        setAwardForm((f) => ({ ...f, award_date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="aw-org">수여기관</Label>
                    <Input
                      id="aw-org"
                      className="mt-1"
                      value={awardForm.organization}
                      onChange={(e) =>
                        setAwardForm((f) => ({ ...f, organization: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="aw-part">참가대상</Label>
                    <Input
                      id="aw-part"
                      className="mt-1"
                      value={awardForm.participants}
                      onChange={(e) =>
                        setAwardForm((f) => ({ ...f, participants: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading === "award"}>
                      {awardForm.editingId ? "저장" : "추가"}
                    </Button>
                    {awardForm.editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setAwardForm({
                            grade: 1,
                            semester: 1,
                            award_name: "",
                            rank: "",
                            award_date: "",
                            organization: "",
                            participants: "",
                            editingId: null,
                          })
                        }
                      >
                        취소
                      </Button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}

              <ul className="space-y-2 text-sm">
                {awards.map((w) => (
                  <li key={w.id} className="rounded border p-2">
                    <div className="font-medium">
                      {w.grade}학년 {w.semester}학기 · {w.award_name}
                      {w.rank ? ` (${w.rank})` : ""}
                    </div>
                    <div className="text-muted-foreground">
                      {w.award_date ?? "일자 미입력"}
                      {w.organization ? ` · ${w.organization}` : ""}
                      {w.participants ? ` · 대상: ${w.participants}` : ""}
                    </div>
                    {isAdmin ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setAwardForm({
                              grade: w.grade,
                              semester: w.semester,
                              award_name: w.award_name,
                              rank: w.rank ?? "",
                              award_date: w.award_date ?? "",
                              organization: w.organization ?? "",
                              participants: w.participants ?? "",
                              editingId: w.id,
                            })
                          }
                        >
                          수정
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void deleteAward(w.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle>행동특성 및 종합의견</CardTitle>
              <CardDescription>학년당 1건. 학종·RAG 연동 시 근거 텍스트로 활용됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? null : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}
              {([1, 2, 3] as const).map((g) => {
                const behRow = behaviors.find((b) => b.grade === g);
                return (
                  <div key={g} className="rounded-lg border p-4">
                    <Label className="text-base font-medium">{g}학년</Label>
                    {isAdmin ? (
                      <>
                        <textarea
                          className={cn(textareaClass, "mt-2")}
                          maxLength={MAX_RECORD_TEXT}
                          value={behaviorDrafts[g] ?? ""}
                          onChange={(e) =>
                            setBehaviorDrafts((d) => ({ ...d, [g]: e.target.value }))
                          }
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                          {(behaviorDrafts[g] ?? "").length} / {MAX_RECORD_TEXT}
                        </p>
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={loading === `beh-${g}`}
                          onClick={() => void saveBehavior(g)}
                        >
                          저장
                        </Button>
                      </>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {behRow?.content?.trim() ? behRow.content : "내용 없음"}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>출결상황</CardTitle>
              <CardDescription>
                학년별 1건 upsert. NEIS 용어: 지각·조퇴·결과(질병/미인정/기타). 숫자는 0 이상입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {isAdmin ? null : (
                <p className="text-sm text-muted-foreground">조회 전용입니다. 입력·저장은 관리자만 가능합니다.</p>
              )}
              {([1, 2, 3] as const).map((g) => (
                <div key={g} className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">{g}학년</h3>
                  <div>
                    <Label>수업일수</Label>
                    <Input
                      type="number"
                      min={0}
                      className="mt-1 max-w-[140px]"
                      disabled={!isAdmin}
                      value={attForms[g].school_days}
                      onChange={(e) =>
                        setAttForms((prev) => ({
                          ...prev,
                          [g]: { ...prev[g], school_days: e.target.value },
                        }))
                      }
                    />
                  </div>
                  {attendanceCountGrid(
                    "결석",
                    "absence_illness",
                    "absence_unauthorized",
                    "absence_other",
                    g,
                    !isAdmin,
                  )}
                  {attendanceCountGrid(
                    "지각",
                    "late_illness",
                    "late_unauthorized",
                    "late_other",
                    g,
                    !isAdmin,
                  )}
                  {attendanceCountGrid(
                    "조퇴",
                    "early_leave_illness",
                    "early_leave_unauthorized",
                    "early_leave_other",
                    g,
                    !isAdmin,
                  )}
                  {attendanceCountGrid(
                    "결과",
                    "result_illness",
                    "result_unauthorized",
                    "result_other",
                    g,
                    !isAdmin,
                  )}
                  <div>
                    <Label>특기사항</Label>
                    <textarea
                      className={cn(textareaClass, "mt-1")}
                      disabled={!isAdmin}
                      value={attForms[g].note}
                      onChange={(e) =>
                        setAttForms((prev) => ({
                          ...prev,
                          [g]: { ...prev[g], note: e.target.value },
                        }))
                      }
                    />
                  </div>
                  {isAdmin ? (
                    <Button
                      type="button"
                      disabled={loading === `att-${g}`}
                      onClick={() => void saveAttendanceGrade(g)}
                    >
                      {g}학년 저장
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteer">
          <Card>
            <CardHeader>
              <CardTitle>봉사활동 실적</CardTitle>
              <CardDescription>
                학년·기간·장소·활동·시간. 누계시간은 저장 시 같은 학생 전체 행 기준으로 자동 갱신됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitVolunteer} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">봉사 추가</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={volForm.grade}
                        onChange={(e) =>
                          setVolForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="vol-hours">시간</Label>
                      <Input
                        id="vol-hours"
                        type="number"
                        min={0}
                        className="mt-1"
                        value={volForm.hours}
                        onChange={(e) => setVolForm((f) => ({ ...f, hours: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vol-period">일자 또는 기간</Label>
                    <Input
                      id="vol-period"
                      className="mt-1"
                      value={volForm.period}
                      onChange={(e) => setVolForm((f) => ({ ...f, period: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vol-org">장소 / 주관기관명</Label>
                    <Input
                      id="vol-org"
                      className="mt-1"
                      value={volForm.organization}
                      onChange={(e) => setVolForm((f) => ({ ...f, organization: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vol-act">활동내용</Label>
                    <textarea
                      id="vol-act"
                      className={cn(textareaClass, "mt-1")}
                      value={volForm.activity}
                      onChange={(e) => setVolForm((f) => ({ ...f, activity: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={loading === "vol"}>
                    추가
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}
              <ul className="space-y-2 text-sm">
                {volunteerItems.length === 0 ? (
                  <li className="text-muted-foreground">등록된 봉사 실적이 없습니다.</li>
                ) : (
                  volunteerItems.map((v) => (
                    <li key={v.id} className="rounded-lg border p-3">
                      <div className="font-medium">
                        {v.grade}학년 · {v.period} · {v.organization} · {v.hours}시간
                        {v.cumulative_hours != null ? ` · 누계 ${v.cumulative_hours}시간` : ""}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{v.activity}</p>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => void deleteVolunteer(v.id)}
                        >
                          삭제
                        </Button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reading">
          <Card>
            <CardHeader>
              <CardTitle>독서활동상황</CardTitle>
              <CardDescription>학년·과목 또는 영역(선택)·활동 상황 (최대 {MAX_RECORD_TEXT}자)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitReading} className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={readForm.grade}
                        onChange={(e) =>
                          setReadForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="read-area">과목 또는 영역 (선택)</Label>
                      <Input
                        id="read-area"
                        className="mt-1"
                        value={readForm.subject_area}
                        onChange={(e) =>
                          setReadForm((f) => ({ ...f, subject_area: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="read-content">독서 활동 상황</Label>
                    <textarea
                      id="read-content"
                      className={cn(textareaClass, "mt-1")}
                      maxLength={MAX_RECORD_TEXT}
                      value={readForm.content}
                      onChange={(e) => setReadForm((f) => ({ ...f, content: e.target.value }))}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {readForm.content.length} / {MAX_RECORD_TEXT}
                    </p>
                  </div>
                  <Button type="submit" disabled={loading === "read"}>
                    추가
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}
              <ul className="space-y-2 text-sm">
                {readingItems.length === 0 ? (
                  <li className="text-muted-foreground">등록된 독서 기록이 없습니다.</li>
                ) : null}
                {readingItems.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3">
                    <div className="font-medium">
                      {r.grade}학년 · {r.subject_area?.trim() ? r.subject_area : "영역 미기재"}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {r.content ?? ""}
                    </p>
                    {isAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => void deleteReading(r.id)}
                      >
                        삭제
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>자격증 및 인증 취득상황</CardTitle>
              <CardDescription>구분·명칭·번호·취득일·발급기관</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitCertificate} className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>구분</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={certForm.cert_type}
                        onChange={(e) =>
                          setCertForm((f) => ({
                            ...f,
                            cert_type: e.target.value as "자격증" | "인증",
                          }))
                        }
                      >
                        <option value="자격증">자격증</option>
                        <option value="인증">인증</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="cert-date">취득연월일</Label>
                      <Input
                        id="cert-date"
                        type="date"
                        className="mt-1"
                        value={certForm.acquired_date}
                        onChange={(e) =>
                          setCertForm((f) => ({ ...f, acquired_date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cert-name">명칭 또는 종류</Label>
                    <Input
                      id="cert-name"
                      className="mt-1"
                      value={certForm.cert_name}
                      onChange={(e) => setCertForm((f) => ({ ...f, cert_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cert-num">번호 또는 내용</Label>
                    <Input
                      id="cert-num"
                      className="mt-1"
                      value={certForm.cert_number}
                      onChange={(e) => setCertForm((f) => ({ ...f, cert_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cert-issuer">발급기관</Label>
                    <Input
                      id="cert-issuer"
                      className="mt-1"
                      value={certForm.issuer}
                      onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={loading === "cert"}>
                    추가
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}
              <ul className="space-y-2 text-sm">
                {certItems.length === 0 ? (
                  <li className="text-muted-foreground">등록된 자격증·인증이 없습니다.</li>
                ) : (
                  certItems.map((c) => (
                    <li key={c.id} className="rounded-lg border p-3">
                      <div className="font-medium">
                        [{c.cert_type}] {c.cert_name}
                      </div>
                      <div className="text-muted-foreground">
                        {c.cert_number ? `번호: ${c.cert_number} · ` : ""}
                        {c.acquired_date ?? "일자 미기재"}
                        {c.issuer ? ` · ${c.issuer}` : ""}
                      </div>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => void deleteCertificate(c.id)}
                        >
                          삭제
                        </Button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="school-violence">
          <Card>
            <CardHeader>
              <CardTitle>학교폭력 조치사항</CardTitle>
              <CardDescription>
                민감 정보입니다. 가족 계정은 본인 데이터 조회가 가능하며, 추가·삭제는 관리자만 할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin ? (
                <form onSubmit={submitSchoolViolence} className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>학년</Label>
                      <select
                        className={cn(selectClass, "mt-1")}
                        value={violenceForm.grade}
                        onChange={(e) =>
                          setViolenceForm((f) => ({ ...f, grade: Number(e.target.value) }))
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="sv-date">조치결정 일자</Label>
                      <Input
                        id="sv-date"
                        type="date"
                        className="mt-1"
                        value={violenceForm.decision_date}
                        onChange={(e) =>
                          setViolenceForm((f) => ({ ...f, decision_date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sv-detail">조치사항</Label>
                    <textarea
                      id="sv-detail"
                      className={cn(textareaClass, "mt-1")}
                      maxLength={MAX_RECORD_TEXT}
                      value={violenceForm.action_detail}
                      onChange={(e) =>
                        setViolenceForm((f) => ({ ...f, action_detail: e.target.value }))
                      }
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {violenceForm.action_detail.length} / {MAX_RECORD_TEXT}
                    </p>
                  </div>
                  <Button type="submit" disabled={loading === "sv"}>
                    추가
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">조회 전용입니다.</p>
              )}
              <ul className="space-y-2 text-sm">
                {violenceItems.length === 0 ? (
                  <li className="text-muted-foreground">등록된 조치 기록이 없습니다.</li>
                ) : (
                  violenceItems.map((r) => (
                    <li key={r.id} className="rounded-lg border p-3">
                      <div className="font-medium">
                        {r.grade}학년 · {r.decision_date}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {r.action_detail}
                      </p>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => void deleteSchoolViolence(r.id)}
                        >
                          삭제
                        </Button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
