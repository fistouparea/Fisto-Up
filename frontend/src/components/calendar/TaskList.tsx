import { LuCircleCheck } from 'react-icons/lu';

/** "आज का काम": simple list with a check-circle per task. */
export function TaskList({ tasks }: { tasks: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task} className="flex gap-3 text-lg leading-snug">
          <LuCircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary-600" />
          <span>{task}</span>
        </li>
      ))}
    </ul>
  );
}
