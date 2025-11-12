// Test database connection
import "dotenv/config";
import postgres from "postgres";

async function testConnection() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL is not set in environment variables");
    process.exit(1);
  }

  console.log("🔌 Testing database connection...");

  const client = postgres(connectionString, {
    ssl: "require",
    max: 1,
  });

  try {
    const result = await client`SELECT version()`;
    console.log("✅ Database connection successful!");
    console.log("📊 PostgreSQL version:", result[0].version);
    
    // Check if tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log("\n📋 Tables in database:");
    if (tables.length === 0) {
      console.log("   No tables found");
    } else {
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    await client.end();
    process.exit(1);
  }
}

testConnection();

