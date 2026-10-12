import { useEffect, useState } from 'react';
import api from './api';

export type AcademicConfig = { schoolYear: string; semester: string };

export const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  schoolYear: '2026–2027',
  semester: '1st Semester',
};

/** Convert '1st Semester' / '2nd Semester' labels to 1 / 2 for API filters. */
export const semesterNo = (semester: string): number => {
  const m = semester.match(/(\d+)/);
  const n = m ? Number(m[1]) : 1;
  return n === 2 ? 2 : 1;
};

export const useAcademicConfig = () => {
  const [config, setConfig] = useState<AcademicConfig>(DEFAULT_ACADEMIC_CONFIG);

  useEffect(() => {
    let active = true;
    api.get<{ data: AcademicConfig }>('/portal/config/academic')
      .then((response) => {
        if (active && response.data.data?.schoolYear && response.data.data?.semester) setConfig(response.data.data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return config;
};
