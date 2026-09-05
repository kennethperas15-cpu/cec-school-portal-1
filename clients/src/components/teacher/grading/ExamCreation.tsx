import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Props {
  className?: string;
}

export const ExamCreation = ({ className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch ExamCreation data
    api.get('/examcreation').then(setData);
  }, []);

  return (
    <div className="cec-card p-6">
      <h2 className="text-[#0B3D91] font-bold">ExamCreation</h2>
      {/* Thesis-ready implementation */}
    </div>
  );
};