
const API_KEY = 'ODAyMDI2MGMtMGYwOS00YmFlLTgxYjAtYWE5N2JjOWQwMGEw';
const BASE_URL = 'https://api.clockify.me/api/v1';
const REPORT_BASE_URL = 'https://reports.api.clockify.me/v1';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Error requesting ${url}:`, text);
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

async function getAllTimeEntries(workspaceId: string) {
  let allEntries: any[] = [];
  const currentYear = new Date().getFullYear();
  const startYear = 2018; // Start from a reasonable year or iterate backwards

  console.log(`  Fetching time entries for workspace ${workspaceId} in yearly chunks...`);

  for (let year = startYear; year <= currentYear; year++) {
    let page = 1;
    const pageSize = 200;
    const dateRangeStart = `${year}-01-01T00:00:00.000Z`;
    const dateRangeEnd = `${year}-12-31T23:59:59.999Z`;
    
    console.log(`    Processing year ${year}...`);

    try {
      while (true) {
        const payload = {
          dateRangeStart,
          dateRangeEnd,
          detailedFilter: {
            page: page,
            pageSize: pageSize,
          }
        };

        const data = await fetchWithAuth(`${REPORT_BASE_URL}/workspaces/${workspaceId}/reports/detailed`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!data.timeentries || data.timeentries.length === 0) {
          break;
        }

        allEntries = allEntries.concat(data.timeentries);
        console.log(`      Page ${page} fetched (${data.timeentries.length} entries)`);
        
        if (data.timeentries.length < pageSize) {
          break;
        }
        page++;
      }
    } catch (err) {
      console.warn(`      Reports API failed for year ${year}, attempting direct user fetch fallback...`);
      const user = await fetchWithAuth(`${BASE_URL}/user`);
      let userPage = 1;
      while (true) {
        const perPage = 100;
        // Direct fetch also supports start/end
        const url = `${BASE_URL}/workspaces/${workspaceId}/user/${user.id}/time-entries?start=${dateRangeStart}&end=${dateRangeEnd}&page=${userPage}&page-size=${perPage}`;
        const data = await fetchWithAuth(url);
        
        if (!data || data.length === 0) break;
        
        allEntries = allEntries.concat(data);
        console.log(`      Direct Page ${userPage} fetched (${data.length} entries)`);
        
        if (data.length < perPage) break;
        userPage++;
      }
    }
  }
  
  return allEntries;
}

async function main() {
  try {
    console.log("Starting Clockify data export...");
    
    // 0. Test connectivity and fetch basic info
    const currentUser = await fetchWithAuth(`${BASE_URL}/user`);
    console.log(`Authenticated as: ${currentUser.name} (${currentUser.email})`);

    // 1. Fetch Workspaces
    const workspaces = await fetchWithAuth(`${BASE_URL}/workspaces`);
    console.log(`Found ${workspaces.length} workspaces.`);

    const exportData: any = {
      exportedAt: new Date().toISOString(),
      user: currentUser,
      workspaces: []
    };

    for (const ws of workspaces) {
      console.log(`\nProcessing workspace: ${ws.name} (${ws.id})`);
      
      // 2. Fetch Projects
      console.log(`  Fetching projects...`);
      const projects = await fetchWithAuth(`${BASE_URL}/workspaces/${ws.id}/projects?page-size=1000`);
      
      // 3. Fetch Users
      console.log(`  Fetching workspace users...`);
      let users = [];
      try {
        users = await fetchWithAuth(`${BASE_URL}/workspaces/${ws.id}/users?page-size=1000`);
      } catch (e) {
        console.warn(`  Could not fetch users list (might need workspace admin). Skipping users list.`);
      }
      
      // 4. Fetch Clients
      console.log(`  Fetching clients...`);
      const clients = await fetchWithAuth(`${BASE_URL}/workspaces/${ws.id}/clients?page-size=1000`);

      // 5. Fetch Tags
      console.log(`  Fetching tags...`);
      const tags = await fetchWithAuth(`${BASE_URL}/workspaces/${ws.id}/tags?page-size=1000`);

      // 6. Fetch Time Entries
      const timeEntries = await getAllTimeEntries(ws.id);

      exportData.workspaces.push({
        id: ws.id,
        name: ws.name,
        projects,
        users,
        clients,
        tags,
        timeEntries
      });
    }

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('clockify_data_export.json', JSON.stringify(exportData, null, 2));
    
    console.log("\nSuccess! Clockify data saved to clockify_data_export.json");
    const totalEntries = exportData.workspaces.reduce((acc: number, ws: any) => acc + ws.timeEntries.length, 0);
    console.log(`Total time entries exported: ${totalEntries}`);
  } catch (error) {
    console.error("\nCRITICAL Error exporting Clockify data:");
    console.error(error);
  }
}

main();
