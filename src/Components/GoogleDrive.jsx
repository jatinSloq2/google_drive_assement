import { useEffect, useRef, useState } from "react";
import { gapi } from "gapi-script";

const CLIENT_ID =
  "205240368693-3aiep53kgipfi547g536u3q4110d29qf.apps.googleusercontent.com";
const API_KEY = "AIzaSyCdf7ypLirGRCsRIk7KGMZ5p5CcLVsDg-M";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

function GoogleDrive() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const tokenClient = useRef(null);

  useEffect(() => {
    function initializeGapi() {
      gapi.client
        .init({
          apiKey: API_KEY,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
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

  const listFiles = async () => {
    try {
      const res = await gapi.client.drive.files.list({
        pageSize: 120,
        fields: "files(id, name, mimeType, webViewLink)",
      });
      setFiles(res.result.files);
    } catch (err) {
      console.error("❌ Error listing files:", err);
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const metadata = {
        name: file.name,
        mimeType: file.type,
      };

      const accessToken = gapi.client.getToken().access_token;

      const form = new FormData();
      const blob = new Blob([file], { type: file.type });
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", blob);

      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
          body: form,
        }
      );

      const result = await res.json();
      alert("File uploaded successfully!");
      console.log("✅ File uploaded:", result);
      listFiles();
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    const accessToken = gapi.client.getToken().access_token;

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            📁 <span>My Google Drive</span>
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
                  onClick={listFiles}
                  className="bg-green-600 text-white px-5 py-2 rounded-md shadow hover:bg-green-700 transition"
                >
                  Load My Files
                </button>
                <label className="cursor-pointer bg-purple-600 text-white px-5 py-2 rounded-md shadow hover:bg-purple-700 transition">
                  Upload File
                  <input
                    type="file"
                    accept="*/*"
                    onChange={uploadFile}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Files Grid */}
        {files.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {files.map((file) => {
              const isImage = file.mimeType.startsWith("image/");
              const isPDF = file.mimeType === "application/pdf";
              const fallback =
                "https://via.placeholder.com/300x200.png?text=No+Preview";

              return (
                <div
                  key={file.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-200 overflow-hidden flex flex-col"
                >
                  <div className="h-40 bg-gray-50 flex items-center justify-center">
                    {isImage ? (
                      <img
                        src={`https://drive.google.com/thumbnail?id=${file.id}`}
                        alt={file.name}
                        className="object-contain w-full h-full"
                      />
                    ) : isPDF ? (
                      <iframe
                        title={file.name}
                        src={`https://drive.google.com/file/d/${file.id}/preview`}
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={fallback}
                        alt="No Preview"
                        className="object-contain w-full h-full"
                      />
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <p
                      className="text-sm font-medium text-gray-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-xs">
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        🔗 View
                      </a>
                      <button
                        onClick={() => downloadFile(file.id, file.name)}
                        className="text-green-600 hover:underline"
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          isSignedIn && (
            <div className="text-center text-gray-500 mt-20">
              No files loaded yet. Click “Load My Files” to fetch.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default GoogleDrive;
