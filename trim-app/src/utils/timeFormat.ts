export interface TimeRemainingData {
  text: string;
  isOverdue: boolean;
  isUrgent: boolean; // 1분 미만
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function formatTimeRemaining(deadline: string): TimeRemainingData {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  
  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);
  
  // 시간 단위 계산
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
  
  // 1분 미만인지 체크
  const isUrgent = absDiff < 60 * 1000;
  
  // 텍스트 포맷
  let text = '';
  
  if (isOverdue) {
    // Overdue: "-2h 30m 15s"
    if (days > 0) {
      text = `-${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      text = `-${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      text = `-${minutes}m ${seconds}s`;
    } else {
      text = `-${seconds}s`;
    }
  } else {
    // 남은 시간
    if (days > 0) {
      text = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds}s`;
    } else {
      text = `${seconds}s`;
    }
  }
  
  return { text, isOverdue, isUrgent, days, hours, minutes, seconds };
}
