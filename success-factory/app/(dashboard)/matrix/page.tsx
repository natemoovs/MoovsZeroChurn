"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function MoovsMatrixPage() {
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="mb-4">
          <h1 className="text-content-primary text-2xl font-bold sm:text-3xl">Moovs Matrix</h1>
          <p className="text-content-secondary mt-1">
            Customer segmentation and health matrix view
          </p>
        </div>

        <div className="card-sf flex-1 overflow-hidden p-0">
          <iframe
            src="https://swoop.retool.com/embedded/public/9be17fae-1ee8-4769-b27a-0545fa6039dd/home"
            className="h-full w-full border-0"
            title="Moovs Matrix"
            allow="clipboard-write"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
