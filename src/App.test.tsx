import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('初始界面', () => {
  it('渲染项目标题“ Mistweave of Fates”', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Mistweave of Fates' })).toBeInTheDocument();
  });

  it('渲染地点“灰炉药房”', () => {
    render(<App />);
    expect(screen.getByText('瓦伦港，灰炉药房')).toBeInTheDocument();
  });

  it('渲染可访问的“开始调查”按钮', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '开始调查' })).toBeInTheDocument();
  });

  it('允许玩家结算一个调查任务', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '开始调查' }));
    await user.click(screen.getByRole('button', { name: '接触：误投的药箱' }));
    await user.click(screen.getByRole('button', { name: '谨慎调查（15 分钟）' }));
    expect(screen.getByText(/判定：/)).toBeInTheDocument();
    expect(screen.getByText('线索：误投的药箱')).toBeInTheDocument();
  });

  it('将自由行动映射到现有案件并拒绝未知行动', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '开始调查' }));
    await user.type(screen.getByLabelText('自由行动'), '检查药箱');
    await user.click(screen.getByRole('button', { name: '尝试行动' }));
    expect(screen.getByText('已识别行动：药箱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '谨慎调查（15 分钟）' })).toBeInTheDocument();
  });
});
