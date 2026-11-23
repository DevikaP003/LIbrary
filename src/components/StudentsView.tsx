import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { StudentRecord } from '../types';

interface StudentsViewProps {
  students: StudentRecord[];
  loading: boolean;
  onAddStudent: () => void;
  onEditStudent: (student: StudentRecord) => void;
  onDeleteStudent: (student: StudentRecord) => void;
  onIssueToStudent: (student: StudentRecord) => void;
}

export function StudentsView({
  students,
  loading,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onIssueToStudent,
}: StudentsViewProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.dept?.trim()) set.add(s.dept.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((student) => {
      if (deptFilter !== 'all' && student.dept !== deptFilter) return false;
      if (!q) return true;
      return (
        String(student.usn).includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.dept.toLowerCase().includes(q)
      );
    });
  }, [students, search, deptFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D2E2DF] bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#436470] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by USN, student name, or department..."
            className="w-full min-h-[40px] pl-10 pr-4 py-2 text-sm bg-[#F6FAF9] border border-[#C2D8D5] rounded-lg text-[#0B2834] placeholder:text-[#66848E] focus:bg-white focus:border-[#0E5A7A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#E7F1EF] rounded-lg overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setDeptFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                deptFilter === 'all'
                  ? 'bg-white text-[#0B2834] shadow-xs'
                  : 'text-[#436470] hover:text-[#0B2834]'
              }`}
            >
              All ({students.length})
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setDeptFilter(dept)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  deptFilter === dept
                    ? 'bg-white text-[#0E5A7A] shadow-xs'
                    : 'text-[#436470] hover:text-[#0B2834]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddStudent}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      <div className="border border-[#D2E2DF] bg-white rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(11,40,52,0.03)]">
        {loading && students.length === 0 ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-12 bg-[#F1F6F5] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-[#0B2834]">
              No matching students found
            </h3>
            <p className="mt-1 text-sm text-[#436470]">
              Try a different search query or register a new student in the directory.
            </p>
            <button
              type="button"
              onClick={onAddStudent}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0E5A7A] hover:bg-[#0A455E] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Student</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D2E2DF] bg-[#F6FAF9] text-xs font-medium text-[#436470]">
                  <th className="py-3.5 px-5 whitespace-nowrap">USN</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Active Borrows</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Borrows</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EFED] text-sm">
                {filtered.map((student) => (
                  <tr key={student.usn} className="hover:bg-[#F6FAF9] transition-colors">
                    <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-[#436470]">
                      {student.usn}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0B2834]">{student.name}</td>
                    <td className="py-3.5 px-4 text-[#436470]">{student.dept}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <span
                        className={
                          student.active_borrows > 0
                            ? 'text-[#0E5A7A] font-medium'
                            : 'text-[#157A56]'
                        }
                      >
                        {student.active_borrows}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#436470]">
                      {student.total_borrows}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onIssueToStudent(student)}
                          className="px-3 py-1.5 text-xs font-medium text-[#0E5A7A] border border-[#C2D8D5] hover:bg-[#E7F1EF] rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          Issue Book
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditStudent(student)}
                          aria-label={`Edit ${student.name}`}
                          className="p-2 text-[#436470] hover:text-[#0B2834] hover:bg-[#E7F1EF] rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student)}
                          aria-label={`Delete ${student.name}`}
                          className="p-2 text-[#436470] hover:text-[#9F1239] hover:bg-[#FFF1F2] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
