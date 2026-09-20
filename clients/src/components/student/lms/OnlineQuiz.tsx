import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Props {
  className?: string;
}

export const OnlineQuiz = ({ className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch OnlineQuiz data
    api.get('/onlinequiz').then((response) => setData(response.data));
  }, []);

  return (
    <div className="cec-card p-6">
      <h2 className="text-[#0B3D91] font-bold">OnlineQuiz</h2>
      {/* Thesis-ready implementation */}
    </div>
  );
};