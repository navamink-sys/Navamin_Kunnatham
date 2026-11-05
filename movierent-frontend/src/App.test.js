// ==========================================
// นำเข้าเครื่องมือสำหรับเขียน Unit Test ของ React
// ==========================================
import { render, screen } from '@testing-library/react';
import App from './App';

// คำสั่งทดสอบว่าหน้า App เรนเดอร์คำว่า 'learn react' ขึ้นมาบนจอได้ไหม
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});