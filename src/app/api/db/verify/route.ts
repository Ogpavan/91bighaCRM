import { NextResponse } from "next/server";
import { getDatabaseConfig } from "@/lib/db-config";
import { testDatabaseConnection, verifyPropertySchema } from "@/lib/db";

export async function GET() {
  const config = getDatabaseConfig();

  try {
    const connection = await testDatabaseConnection();
    const schema = await verifyPropertySchema();

    return NextResponse.json({
      ok: true,
      database: {
        host: config.host,
        port: config.port,
        name: config.database,
        connected: true,
        serverTime: connection.now,
        currentDatabase: connection.current_database
      },
      schema: {
        verified: schema.missingTables.length === 0,
        existingTables: schema.existingTables,
        missingTables: schema.missingTables
      },
      seed: {
        propertyTypes: schema.counts.propertyTypes,
        propertyLocations: schema.counts.propertyLocations,
        properties: schema.counts.properties
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database verification error";

    return NextResponse.json(
      {
        ok: false,
        database: {
          host: config.host,
          port: config.port,
          name: config.database
        },
        error: message
      },
      { status: 500 }
    );
  }
}
