import { useEffect, useRef, useState } from "react";
import { gapi } from "gapi-script";

const CLIENT_ID =
  "205240368693-3aiep53kgipfi547g536u3q4110d29qf.apps.googleusercontent.com";
const API_KEY = "AIzaSyCdf7ypLirGRCsRIk7KGMZ5p5CcLVsDg-M";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly";

function GoogleSheets() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const tokenClient = useRef(null);

  useEffect(() => {
    function initializeGapi() {
      gapi.client
        .init({
          apiKey: API_KEY,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
            "https://sheets.googleapis.com/$discovery/rest?version=v4",
          ],
        })
        .then(() => console.log("✅ GAPI client loaded"));
    }

    gapi.load("client", initializeGapi);

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            gapi.client.setToken({ access_token: response.access_token });
            setIsSignedIn(true);
          }
        },
      });
    };
    document.body.appendChild(script);
  }, []);

  const signIn = () => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken();
    }
  };

  const listSheets = async () => {
    setLoading(true);
    try {
      const res = await gapi.client.drive.files.list({
        pageSize: 50,
        fields: "files(id, name, modifiedTime, createdTime)",
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        orderBy: "modifiedTime desc",
      });
      setSheets(res.result.files);
    } catch (err) {
      console.error("❌ Error listing sheets:", err);
    }
    setLoading(false);
  };

  const viewSheetData = async (sheetId, sheetName) => {
    setLoading(true);
    setSelectedSheet({ id: sheetId, name: sheetName });
    try {
      const res = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z1000",
      });
      setSheetData(res.result.values || []);
    } catch (err) {
      console.error("❌ Error fetching sheet data:", err);
      setSheetData([]);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-6 py-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            📊 <span>My Google Sheets</span>
          </h1>
          <div className="flex gap-3">
            {!isSignedIn ? (
              <button
                onClick={signIn}
                className="bg-blue-600 text-white px-5 py-2 rounded-md shadow hover:bg-blue-700 transition"
              >
                Sign in with Google
              </button>
            ) : (
              <button
                onClick={listSheets}
                className="bg-green-600 text-white px-5 py-2 rounded-md shadow hover:bg-green-700 transition"
              >
                {loading ? "Loading..." : "Load My Sheets"}
              </button>
            )}
          </div>
        </div>

        {/* Back Button */}
        {selectedSheet && (
          <button
            onClick={() => {
              setSelectedSheet(null);
              setSheetData([]);
            }}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Sheets List
          </button>
        )}

        {/* Sheet Data View */}
        {selectedSheet ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {selectedSheet.name}
            </h2>
            {sheetData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {sheetData[0].map((header, idx) => (
                        <th
                          key={idx}
                          className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.slice(1).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-700"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No data found in this sheet.
              </p>
            )}
          </div>
        ) : (
          /* Sheets List */
          sheets.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Sheet Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Created Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Modified Date
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((sheet, idx) => (
                    <tr
                      key={sheet.id}
                      className={`${
                        idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {sheet.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(sheet.createdTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(sheet.modifiedTime)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => viewSheetData(sheet.id, sheet.name)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition"
                        >
                          View Data
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Empty State */}
        {isSignedIn && sheets.length === 0 && !selectedSheet && !loading && (
          <div className="text-center text-gray-500 mt-20">
            No sheets loaded yet. Click "Load My Sheets" to fetch.
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleSheets;