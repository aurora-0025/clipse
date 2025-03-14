import React, { useEffect, useState } from 'react'

function StatusBar() {
    const [indexingStatus, setIndexingStatus] = useState<string | null>(null);

    useEffect(() => {
        window.api.onIndexingStatus((status: string) => {
          setIndexingStatus(status);
        });
      }, []);
    
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-800 text-white text-center py-2">
    {indexingStatus}
  </div>
    
  )
}

export default StatusBar