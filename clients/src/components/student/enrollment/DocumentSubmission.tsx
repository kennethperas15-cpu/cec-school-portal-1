import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Props {
  className?: string;
}

export const DocumentSubmission = ({ className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch DocumentSubmission data
    api.get('/documentsubmission').then(setData);
  }, []);

  return (
    <div className="cec-card p-6">
      <h2 className="text-[#0B3D91] font-bold">DocumentSubmission</h2>
      {/* Thesis-ready implementation */}
    </div>
  );
};