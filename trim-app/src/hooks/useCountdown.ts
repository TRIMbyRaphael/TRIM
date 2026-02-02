import { useState, useEffect } from 'react';
import { formatTimeRemaining, TimeRemainingData } from '../utils/timeFormat';

export function useCountdown(deadline: string): TimeRemainingData {
  const [timeData, setTimeData] = useState<TimeRemainingData>(() => formatTimeRemaining(deadline));

  useEffect(() => {
    // 즉시 한 번 업데이트
    setTimeData(formatTimeRemaining(deadline));

    // 1초마다 업데이트
    const intervalId = setInterval(() => {
      setTimeData(formatTimeRemaining(deadline));
    }, 1000);

    // cleanup: 컴포넌트 unmount 시 interval 정리
    return () => clearInterval(intervalId);
  }, [deadline]);

  return timeData;
}
