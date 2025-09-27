"use client";
import React, { useState } from 'react';
import PrizesTableClient from './prizesTableClient';
import PeriodMetrics from './periodMetrics';

export default function TokensClientWrapper(){
  const [batchId, setBatchId] = useState<string>('ALL');
  return (
    <>
      <div>
        <PrizesTableClient onBatchChange={setBatchId} />
      </div>
      <PeriodMetrics batchId={batchId} />
    </>
  );
}