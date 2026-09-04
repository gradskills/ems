import type { AttendanceRecord, LeaveRequest, Payslip } from "@/lib/types";

// Mock data removed — attendance, leave requests & payslips come from Supabase only.
export const attendance: AttendanceRecord[] = [];
export const leaveRequests: LeaveRequest[] = [];
export const payslips: Payslip[] = [];

export function todayAttendance(userId: string): AttendanceRecord | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return attendance.find((a) => a.userId === userId && a.date === today);
}
