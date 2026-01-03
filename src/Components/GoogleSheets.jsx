import { useEffect, useRef, useState } from "react";
import { gapi } from "gapi-script";

const CLIENT_ID =
  "205240368693-3aiep53kgipfi547g536u3q4110d29qf.apps.googleusercontent.com";
const API_KEY = "AIzaSyCdf7ypLirGRCsRIk7KGMZ5p5CcLVsDg-M";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";

function GoogleSheets() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
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

  const createNewSheet = async () => {
    if (!newSheetName.trim()) {
      alert("Please enter a sheet name");
      return;
    }

    setLoading(true);
    try {
      const res = await gapi.client.sheets.spreadsheets.create({
        properties: {
          title: newSheetName,
        },
        sheets: [
          {
            properties: {
              title: "Sheet1",
            },
          },
        ],
      });

      alert("Sheet created successfully!");
      setNewSheetName("");
      setShowCreateModal(false);
      listSheets();
    } catch (err) {
      console.error("❌ Error creating sheet:", err);
      alert("Failed to create sheet");
    }
    setLoading(false);
  };

  const addRow = async () => {
    if (!selectedSheet || sheetData.length === 0) return;

    const numColumns = sheetData[0].length;
    const newRow = Array(numColumns).fill("");
    const newData = [...sheetData, newRow];
    setSheetData(newData);

    try {
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: selectedSheet.id,
        range: "A1",
        valueInputOption: "RAW",
        resource: {
          values: [newRow],
        },
      });
      alert("Row added successfully!");
    } catch (err) {
      console.error("❌ Error adding row:", err);
      alert("Failed to add row");
    }
  };

  const startEdit = (rowIdx, colIdx, value) => {
    setEditingCell({ row: rowIdx, col: colIdx });
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingCell || !selectedSheet) return;

    const { row, col } = editingCell;
    const newData = [...sheetData];
    newData[row][col] = editValue;
    setSheetData(newData);

    const columnLetter = String.fromCharCode(65 + col);
    const range = `${columnLetter}${row + 1}`;

    try {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: selectedSheet.id,
        range: range,
        valueInputOption: "RAW",
        resource: {
          values: [[editValue]],
        },
      });
      setEditingCell(null);
      setEditValue("");
    } catch (err) {
      console.error("❌ Error updating cell:", err);
      alert("Failed to update cell");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
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
              <>
                <button
                  onClick={listSheets}
                  className="bg-green-600 text-white px-5 py-2 rounded-md shadow hover:bg-green-700 transition"
                >
                  {loading ? "Loading..." : "Load My Sheets"}
                </button>
                {!selectedSheet && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-purple-600 text-white px-5 py-2 rounded-md shadow hover:bg-purple-700 transition"
                  >
                    ➕ Create New Sheet
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create Sheet Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Create New Sheet
              </h2>
              <input
                type="text"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                placeholder="Enter sheet name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={createNewSheet}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSheetName("");
                  }}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        {selectedSheet && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setSelectedSheet(null);
                setSheetData([]);
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← Back to Sheets List
            </button>
            <button
              onClick={addRow}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
            >
              ➕ Add Row
            </button>
          </div>
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
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-700 relative"
                          >
                            {editingCell?.row === rowIdx + 1 &&
                            editingCell?.col === cellIdx ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-blue-500 rounded"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEdit}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  startEdit(rowIdx + 1, cellIdx, cell)
                                }
                                className="cursor-pointer hover:bg-blue-50 min-h-6"
                              >
                                {cell}
                              </div>
                            )}
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