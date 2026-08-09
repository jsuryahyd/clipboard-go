package db

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestDB(t *testing.T) (*DB, string) {
	tempDir, err := os.MkdirTemp("", "clipboard_go_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tempDir, "test_clipboard.db")
	database, err := InitDB(dbPath)
	if err != nil {
		os.RemoveAll(tempDir)
		t.Fatalf("Failed to initialize test DB: %v", err)
	}

	return database, tempDir
}

func TestInsertAndGetItem(t *testing.T) {
	database, tempDir := setupTestDB(t)
	defer os.RemoveAll(tempDir)
	defer database.Close()

	item, err := database.InsertItem("text", "Hello World", "VSCode")
	if err != nil {
		t.Fatalf("InsertItem failed: %v", err)
	}

	if item.Content != "Hello World" || item.Type != "text" || item.SourceApp != "VSCode" {
		t.Errorf("Unexpected item content: %+v", item)
	}

	items, err := database.GetRecentItems(10, 0, "", "", false)
	if err != nil {
		t.Fatalf("GetRecentItems failed: %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("Expected 1 item, got %d", len(items))
	}
}

func TestPreventDuplicateSequentialInsert(t *testing.T) {
	database, tempDir := setupTestDB(t)
	defer os.RemoveAll(tempDir)
	defer database.Close()

	item1, err := database.InsertItem("text", "Same Content", "App1")
	if err != nil {
		t.Fatalf("First insert failed: %v", err)
	}

	item2, err := database.InsertItem("text", "Same Content", "App2")
	if err != nil {
		t.Fatalf("Second insert failed: %v", err)
	}

	if item1.ID != item2.ID {
		t.Errorf("Expected duplicate insert to update existing item ID %d, got new ID %d", item1.ID, item2.ID)
	}

	items, err := database.GetRecentItems(10, 0, "", "", false)
	if err != nil {
		t.Fatalf("GetRecentItems failed: %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("Expected 1 item total, got %d", len(items))
	}
}

func TestPinAndFilter(t *testing.T) {
	database, tempDir := setupTestDB(t)
	defer os.RemoveAll(tempDir)
	defer database.Close()

	item1, _ := database.InsertItem("text", "Item 1", "App")
	_, _ = database.InsertItem("text", "Item 2", "App")

	pinned, err := database.TogglePin(item1.ID)
	if err != nil || !pinned {
		t.Fatalf("TogglePin failed: %v", err)
	}

	pinnedItems, err := database.GetRecentItems(10, 0, "", "", true)
	if err != nil || len(pinnedItems) != 1 {
		t.Fatalf("Expected 1 pinned item, got %d", len(pinnedItems))
	}

	if pinnedItems[0].ID != item1.ID {
		t.Errorf("Mismatch in pinned item ID")
	}
}

func TestTagging(t *testing.T) {
	database, tempDir := setupTestDB(t)
	defer os.RemoveAll(tempDir)
	defer database.Close()

	item, _ := database.InsertItem("text", "Tagged Snippet", "App")
	err := database.AddTag(item.ID, "go")
	if err != nil {
		t.Fatalf("AddTag failed: %v", err)
	}

	items, err := database.GetRecentItems(10, 0, "", "go", false)
	if err != nil || len(items) != 1 {
		t.Fatalf("Expected 1 tagged item, got %d", len(items))
	}
}
