import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeBudgetModalProps {
  initialDeadline: string;
  onConfirm: (deadline: string, timeBudget: number) => void;
  onClose: () => void;
}

export default function TimeBudgetModal({ initialDeadline, onConfirm, onClose }: TimeBudgetModalProps) {
  const [deadline, setDeadline] = useState(new Date(initialDeadline));
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(deadline.getHours());
  const [selectedMinute, setSelectedMinute] = useState(deadline.getMinutes());

  // Calculate initial time budget from deadline
  useEffect(() => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const totalMinutes = Math.max(0, Math.floor(diff / (1000 * 60)));
    
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    
    setDays(d);
    setHours(h);
    setMinutes(m);
  }, []);

  // Time Budget → Deadline
  const handleTimeBudgetChange = (newDays: number, newHours: number, newMinutes: number) => {
    setDays(newDays);
    setHours(newHours);
    setMinutes(newMinutes);

    const totalMinutes = newDays * 1440 + newHours * 60 + newMinutes;
    const newDeadline = new Date(Date.now() + totalMinutes * 60 * 1000);
    setDeadline(newDeadline);
    setSelectedHour(newDeadline.getHours());
    setSelectedMinute(newDeadline.getMinutes());
  };

  // Deadline → Time Budget
  const handleDeadlineChange = (newDeadline: Date) => {
    setDeadline(newDeadline);

    const now = new Date();
    const diff = newDeadline.getTime() - now.getTime();
    const totalMinutes = Math.max(0, Math.floor(diff / (1000 * 60)));
    
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    
    setDays(d);
    setHours(h);
    setMinutes(m);
  };

  const handleDateSelect = (day: number) => {
    const newDeadline = new Date(deadline);
    newDeadline.setDate(day);
    handleDeadlineChange(newDeadline);
  };

  const handleMonthChange = (delta: number) => {
    const newDeadline = new Date(deadline);
    newDeadline.setMonth(newDeadline.getMonth() + delta);
    handleDeadlineChange(newDeadline);
  };

  const handleTimeConfirm = () => {
    const newDeadline = new Date(deadline);
    newDeadline.setHours(selectedHour);
    newDeadline.setMinutes(selectedMinute);
    handleDeadlineChange(newDeadline);
    setShowTimePicker(false);
  };

  const handleConfirm = () => {
    const totalMinutes = days * 1440 + hours * 60 + minutes;
    onConfirm(deadline.toISOString(), totalMinutes);
    onClose();
  };

  // Calendar logic
  const year = deadline.getFullYear();
  const month = deadline.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg md:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-end p-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stretchLimo" />
            </button>
          </div>

          <div className="p-6">
            {/* Time Budget Section */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-stretchLimo mb-4">Time Budget</h3>
              <div className="flex justify-center gap-4">
                {/* Days */}
                <div className="flex flex-col items-center">
                  <label className="text-sm text-micron mb-2">D</label>
                  <select
                    value={days}
                    onChange={(e) => handleTimeBudgetChange(Number(e.target.value), hours, minutes)}
                    className="w-16 h-24 text-center text-2xl font-medium text-stretchLimo border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                {/* Hours */}
                <div className="flex flex-col items-center">
                  <label className="text-sm text-micron mb-2">H</label>
                  <select
                    value={hours}
                    onChange={(e) => handleTimeBudgetChange(days, Number(e.target.value), minutes)}
                    className="w-16 h-24 text-center text-2xl font-medium text-stretchLimo border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <label className="text-sm text-micron mb-2">M</label>
                  <select
                    value={minutes}
                    onChange={(e) => handleTimeBudgetChange(days, hours, Number(e.target.value))}
                    className="w-16 h-24 text-center text-2xl font-medium text-stretchLimo border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6" />

            {/* Deadline Section */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-stretchLimo mb-4">Deadline</h3>

              {/* Month Selector */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => handleMonthChange(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-stretchLimo" />
                </button>
                <span className="text-base font-medium text-stretchLimo">
                  {monthNames[month]}, {year}
                </span>
                <button
                  onClick={() => handleMonthChange(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-stretchLimo" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-center text-xs text-micron font-medium py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => day && handleDateSelect(day)}
                    disabled={!day}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                      day === deadline.getDate()
                        ? 'bg-stretchLimo text-white font-bold'
                        : day
                        ? 'text-stretchLimo hover:bg-gray-100'
                        : ''
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Time Selector */}
              <button
                onClick={() => setShowTimePicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-base text-stretchLimo">Time</span>
                <div className="flex items-center gap-2">
                  <span className="text-base text-stretchLimo">
                    {String(deadline.getHours()).padStart(2, '0')}:{String(deadline.getMinutes()).padStart(2, '0')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-micron" />
                </div>
              </button>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              className="w-full bg-stretchLimo text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowTimePicker(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-stretchLimo">Set Time</h3>
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-stretchLimo" />
                </button>
              </div>

              <div className="flex justify-center gap-4 mb-6">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <label className="text-sm text-micron mb-2">HH</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(Number(e.target.value))}
                    className="w-16 h-24 text-center text-2xl font-medium text-stretchLimo border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center text-2xl font-bold text-stretchLimo pt-8">:</div>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <label className="text-sm text-micron mb-2">MM</label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(Number(e.target.value))}
                    className="w-16 h-24 text-center text-2xl font-medium text-stretchLimo border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleTimeConfirm}
                className="w-full bg-stretchLimo text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
