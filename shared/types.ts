export type AttendanceStatus = "attending" | "not_attending" | "undecided";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  attending: "参加",
  not_attending: "不参加",
  undecided: "未定",
};

export interface Event {
  id: string;
  title: string;
  dateTime: string;
  capacity: number;
  deadline: string;
  createdAt: string;
}

export interface EventWithCounts extends Event {
  counts: {
    attending: number;
    not_attending: number;
    undecided: number;
    total: number;
  };
}

export interface ResponseRecord {
  id: string;
  eventId: string;
  name: string;
  status: AttendanceStatus;
  statusLabel: string;
  updatedAt: string;
}

export interface ResponseHistoryRecord {
  id: string;
  eventId: string;
  name: string;
  previousStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  changedBy: string;
  changedAt: string;
}

export interface CreateEventInput {
  title: string;
  dateTime: string;
  capacity: number;
  deadline: string;
}

export interface UpdateEventInput {
  title?: string;
  dateTime?: string;
  deadline?: string;
  capacity?: number;
}

export interface CreateResponseInput {
  name: string;
  status: AttendanceStatus | (string & {});
}
