export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export const getStatusColor = (status) => {
  const colors = {
    Home: '#f0f0f0',
    Work: '#e3f2fd',
    School: '#e8f5e9'
  };
  return colors[status] || '#f0f0f0';
};