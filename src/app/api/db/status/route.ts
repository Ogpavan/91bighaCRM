import { NextResponse } from "next/server";
import { getDatabaseConfig } from "@/lib/db-config";
import { testDatabaseConnection } from "@/lib/db";

export async function GET() {
  const config = getDatabaseConfig();

  try {
    const dbStatus = await testDatabaseConnection();

    return NextResponse.json({
      ok: true,
      database: {
        host: config.host,
        port: config.port,
        name: config.database,
        connected: true,
        serverTime: dbStatus.now,
        currentDatabase: dbStatus.current_database
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        ok: false,
        database: {
          host: config.host,
          port: config.port,
          name: config.database,
          connected: false
        },
        error: message
      },
      { status: 500 }
    );
  }
}
