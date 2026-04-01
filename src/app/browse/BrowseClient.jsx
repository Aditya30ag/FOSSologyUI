/*
 SPDX-FileCopyrightText: 2025 Tiyasa Kundu (tiyasakundu20@gmail.com)

SPDX-License-Identifier: GPL-2.0-only

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 version 2 as published by the Free Software Foundation.
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along
 with this program; if not, write to the Free Software Foundation, Inc.,
 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import arrayToTree from "array-to-tree";
import "./BrowseClient.css";

// Constants
import routes from "@/constants/routes";
import messages from "@/constants/messages";
import {
  statusOptions,
  entriesOptions,
  assignOptions,
  initialMessage,
} from "@/constants/constants";

// Components
import { InputContainer, Alert } from "@/components/Widgets";
// import TreeContainer from "@/components/TreeContainer";
import Pagination from '@mui/material/Pagination';

// Services
import getBrowseData from "@/services/browse";
import { getAllFolders } from "@/services/folders";
import { scheduleReport, downloadReport } from "@/services/jobs";

// Helpers
import {
  getFileNameFromContentDispostionHeader,
  handleError,
} from "@/shared/helper";

const reportGenerationOptions = [
  { id: 'clixml', name: 'CLIXML generation'},
  { id: 'cyclonedx', name: 'CycloneDX generation'},
  { id: 'readmeoss', name: 'ReadME.OSS generation'},
  { id: 'spdx2', name: 'SPDX2 generation'},
  { id: 'spdx3', name: 'SPDX3 generation'}
];

const BrowseClient = () => {
  const router = useRouter();

  const initialState = {
    folderId: 1,
    page: 1,
    limit: 10,
    recursive: false,
  };

  const [browseData, setBrowseData] = useState(initialState);
  const [browseDataList, setBrowseDataList] = useState([]);
  const [pagesOptions, setPagesOptions] = useState([]);
  const [folderList, setFolderList] = useState([]);
  const [folderCount, setFolderCount] = useState(0);
  const [message, setMessage] = useState(initialMessage);
  const [showMessage, setShowMessage] = useState(false);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [loadingReports, setLoadingReports] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set([1]));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMessage({ type: "success", text: messages.loading });
    setShowMessage(true);

    getBrowseData(browseData)
      .then((res) => {
        setBrowseDataList(res.res);
        setPages(res.pages);
        setPagesOptions(
          Array.from({ length: res.pages }, (_, i) => ({ id: i + 1, value: i + 1 }))
        );
        setShowMessage(false);
      })
      .catch((error) => {
        handleError(error, setMessage);
        setShowMessage(true);
      });
  }, [browseData]);

  useEffect(() => {
    getAllFolders()
      .then((res) => {
        const folders = res.map((folder) => ({
          ...folder,
          state: { expanded: true, favorite: false, deletable: false },
        }));
        setFolderCount(folders.length);
        setFolderList(
          arrayToTree(folders, {
            parentProperty: "parent",
            customID: "id",
          })
        );
      })
      .catch((error) => {
        handleError(error, setMessage);
        setShowMessage(true);
      });
  }, []);

  const handleChange = (e) => {
    if (e.target.name === "limit") {
      setBrowseData({ ...browseData, [e.target.name]: e.target.value, page: 1 });
    } else {
      setBrowseData({ ...browseData, [e.target.name]: e.target.value });
    }
  };

  const handleActionChange = (e, uploadId) => {
    const value = e.target.value;

    if (value === "importReport") {
      router.push(
        `/upload/reportImport?folder=${browseData.folderId}&upload=${uploadId}`
      );
      return;
    }

    scheduleReport(uploadId, value)
      .then((res) => res?.message)
      .then((url) => {
        setTimeout(() => {
          downloadReport(url)
            .then(async (response) => {
              const filename = getFileNameFromContentDispostionHeader(
                response.headers.get("content-disposition")
              );
              const blob = await response.blob();
              const aTag = document.createElement("a");
              aTag.href = window.URL.createObjectURL(blob);
              aTag.download = filename;
              document.body.appendChild(aTag);
              aTag.click();
              setTimeout(() => {
                window.URL.revokeObjectURL(aTag.href);
                document.body.removeChild(aTag);
              }, 150);
            })
            .catch((error) => handleError(error, setMessage));
        }, 1200);
      })
      .catch((error) => {
        handleError(error, setMessage);
        setShowMessage(true);
      });
  };

  const handleReportGeneration = (reportType) => {
    setLoadingReports(prev => new Set(prev).add(reportType));

    // Simulate report generation
    setTimeout(() => {
      setLoadingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportType);
        return newSet;
      });

      setMessage({ type: "success", text: `${reportType} report generated successfully!` });
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }, 2000);
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    const currentPageData = filteredData.slice(
      (browseData.page - 1) * browseData.limit,
      browseData.page * browseData.limit
    );

    if (selectedRows.size === currentPageData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(currentPageData.map(item => item.id)));
    }
  };

  const toggleFolderExpansion = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const expandAllFolders = () => {
    const allFolderIds = folderList.flatMap(folder =>
      [folder.id, ...(folder.children?.map(child => child.id) || [])]
    );
    setExpandedFolders(new Set(allFolderIds));
  };

  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  const filteredData = browseDataList.filter((item) =>
    query ? item?.uploadname.toLowerCase().includes(query.toLowerCase()) : true
  );

  const filteredFolderList = folderList.filter(folder =>
    folderSearchQuery ? folder.name.toLowerCase().includes(folderSearchQuery.toLowerCase()) : true
  );

  const renderFolderTree = (folders, level = 0) => {
    return folders.map(folder => (
      <div key={folder.id}>
        <div
          className={`folder-item ${browseData.folderId === folder.id ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleClick(null, folder.id)}
        >
          <span
            className="folder-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolderExpansion(folder.id);
            }}
          >
            {folder.children?.length > 0 ? (
              expandedFolders.has(folder.id) ? '▼' : '▶'
            ) : (
              '- '
            )}
          </span>
          <span className="folder-name">{folder.name}</span>
        </div>
        {folder.children && expandedFolders.has(folder.id) && (
          <div className="folder-children">
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleClick = (e, id) => {
    if (e?.preventDefault) e.preventDefault();
    setPages(1);
    setBrowseData({ ...browseData, folderId: id, page: 1 });
  };

  const handlePageChange = (e, value) => {
    if (value >= 1) {
      setPages(value);
      setBrowseData({ ...browseData, page: value });
    }
  };

  return (
    <div className="browse-container">
      <div className="browse-title">Browse</div>

      {showMessage && (
        <Alert
          type={message.type}
          setShow={setShowMessage}
          message={message.text}
        />
      )}

      <div className="main-layout">
        {/* Left Sidebar - Folder Navigation */}
        <div
          className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
          style={{ width: sidebarCollapsed ? '60px' : '280px' }}
        >

          <div className="sidebar-header">
            {!sidebarCollapsed && <h3 className="sidebar-title">Folder Navigation</h3>}
            <button
              className="toggle-sidebar"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? '☰' : '◀'}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="sidebar-controls">
                <button className="sidebar-btn" onClick={collapseAllFolders}>
                  Collapse All
                </button>
                <button className="sidebar-btn" onClick={expandAllFolders}>
                  Expand All
                </button>
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="Search folder..."
                value={folderSearchQuery}
                onChange={(e) => setFolderSearchQuery(e.target.value)}
              />

              <div className="folder-tree">
                {renderFolderTree(filteredFolderList)}
              </div>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <h1 className="content-title">Uploads in Software Repository</h1>
          </div>

          <div className="controls-bar">
            <div className="control-group">
              <span className="control-label">Search:</span>
              <input
                type="text"
                className="search-input-main"
                placeholder="Search uploads..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="control-group">
              <span className="control-label">Status:</span>
              <select className="select-input" onChange={handleChange} name="status">
                <option value="">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.id} value={option.name}>{option.name}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <span className="control-label">Assigned to:</span>
              <select className="select-input" onChange={handleChange} name="assign">
                <option value="">All Users</option>
                {assignOptions.map(option => (
                  <option key={option.id} value={option.name}>{option.name}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <span className="control-label">Show entries:</span>
              <select className="select-input" onChange={handleChange} name="limit" value={browseData.limit}>
                {entriesOptions.map(option => (
                  <option key={option.id} value={option.entry}>{option.entry}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      onChange={toggleAllRows}
                      checked={selectedRows.size === filteredData.slice(
                        (browseData.page - 1) * browseData.limit,
                        browseData.page * browseData.limit
                      ).length && filteredData.length > 0}
                    />
                  </th>
                  <th>Upload Name and Description</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Comment</th>
                  <th>Main Licenses</th>
                  <th>Upload Date</th>
                  <th>Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {filteredData
                  .slice(
                    (browseData.page - 1) * browseData.limit,
                    browseData.page * browseData.limit
                  )
                  .map((data) => (
                    <tr key={data?.id}>
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={selectedRows.has(data.id)}
                          onChange={() => toggleRowSelection(data.id)}
                        />
                      </td>
                      <td>
                        <a
                          href={`${routes.browseUploads.licenseBrowser}?uploadID=${data.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <div className="upload-name">{data?.uploadname || 'Unknown Upload'}</div>
                          <div className="upload-description">{data?.description || 'No description available'}</div>
                        </a>
                      </td>
                      <td>
                        <select className="action-select" onChange={(e) => handleActionChange(e, data?.id)}>
                          <option value="">Select action</option>
                          <option value="open">Open</option>
                          <option value="delete">Delete</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status-badge status-${data.status?.replace(' ', '-') || 'unknown'}`}>
                          {data.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{data.comment || '-'}</td>
                      <td>{data.mainLicenses || '-'}</td>
                      <td>{data?.uploaddate ? data.uploaddate.split(".")[0] : 'Unknown Date'}</td>
                      <td>
                        <select
                          className="action-select"
                          onChange={handleChange}
                          name="assign"
                          value={data.assignedTo}
                        >
                          {assignOptions.map(option => (
                            <option key={option.id} value={option.name}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <div className="pagination-info">
              Showing {(browseData.page - 1) * browseData.limit + 1} to {Math.min(browseData.page * browseData.limit, filteredData.length)} of {filteredData.length} entries
            </div>

            {pagesOptions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Pagination
                  count={pages}
                  page={browseData.page}
                  onChange={handlePageChange}
                  color="primary"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Go to:</span>
                  <input
                    type="number"
                    style={{ width: '60px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    onChange={(event) =>
                      handlePageChange(event, Number(event.target.value))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Panel */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 24px' }}>
        <div className="action-buttons">
          <h3 className="action-buttons-title">Run</h3>
          <div className="action-buttons-grid">
            {reportGenerationOptions.map((option) => (
              <button
                key={option.id}
                className={`action-button ${loadingReports.has(option.id) ? 'loading' : ''}`}
                onClick={() => handleReportGeneration(option.id)}
                disabled={loadingReports.has(option.id)}
              >
                <span>{loadingReports.has(option.id) ? 'Generating...' : option.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseClient;
