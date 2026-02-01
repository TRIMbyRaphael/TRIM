export function formatTimeRemaining(deadline: string): { text: string; isOverdue: boolean } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  
  if (diff < 0) {
    // 초과
    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h 초과`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m 초과`;
    } else {
      text = `${minutes}m 초과`;
    }
    
    return { text, isOverdue: true };
  }
  
  // 남음
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let text = '';
  if (days > 0) {
    text = `${days}d ${hours}h 남음`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m 남음`;
  } else {
    text = `${minutes}m 남음`;
  }
  
  return { text, isOverdue: false };
}
