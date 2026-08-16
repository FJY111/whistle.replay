import { Empty } from 'antd';

import './EmptyState.css';

interface Props {
  title: string;
  steps: string[];
}

export default function EmptyState({ title, steps }: Props) {
  return (
    <div className="empty-state">
      <Empty description={title} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      <ol className="empty-state-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
