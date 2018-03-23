// ==========================================
// App Functions 
// ==========================================

// Handle Scrape button
$("#scrape").on("click", function() {

    $.get("/scrape", function(data){
        console.log(data)
        window.location = "/"
    });
});

// Set clicked nav option to active
$(".navbar-nav li").click(function() {
    $(".navbar-nav li").removeClass("active");
    $(this).addClass("active");
});

// Handle Save Article button
$(".save").on("click", function() {
    var thisId = $(this).attr("data-id");
    $.ajax({
        method: "GET",
        url: "/articles/save/" + thisId
    }).done(function(data) {
        window.location = "/saved"
    })
});

// Handle Delete Article button
$(".delete").on("click", function() {
    var thisId = $(this).attr("data-id");
    $.ajax({
        method: "POST",
        url: "/articles/delete/" + thisId
    }).done(function(data) {
        window.location = "/saved"
    })
});

// Handle Add Note button 
$(".addNote").on("click", function() {
    var thisId = $(this).attr("data-id");
    console.log(thisId)
    $("#noteModal").attr("data-articleID", thisId)
     $("#all-notes").empty().addClass("hide")
     $("#no-notes").empty().addClass("hide")
    $.get(`/article/${thisId}/notes/`, function(notes){
        console.log(notes);

        if(notes.length === 0){
            $("#no-notes").removeClass("hide").append(`<h4>No notes for this article yet.</h4>`)
            $("#noteModal").modal("show")
        }else{
            notes.forEach(function(note){
                $("#all-notes").removeClass("hide").append(`
                    <p class="previousNotes">${note.body}</p>
                            <button type="button" class="btn btn-danger deleteNote" data-noteID="${note["_id"]}">X</button>
                    <hr>
                `) 
            })
            $("#noteModal").modal("show")
        }
    })
});

// Handle Save note button
$(document).on("click", "#save-note", function(){
    console.log("clicked")
    var selectedArticleID = $("#noteModal").attr("data-articleID");
    var noteBody = $("#note-body").val().trim()

    console.log(noteBody)
    console.log(selectedArticleID)
    if(noteBody.length > 0){
        var newNote = {
            body: noteBody
        }
        $.post(`/notes/save/${selectedArticleID}`, newNote, function(res){
            console.log("^^^^^",res)
             $("#all-notes").empty().addClass("hide")
             $("#no-notes").empty().addClass("hide")
             $("#all-notes").removeClass("hide").append(`
                    <p class="previousNotes">${res.body}</p>
                            <button type="button" class="btn btn-danger deleteNote" data-noteID="${res["_id"]}">X</button>
                    <hr>
                `) 
             $("#note-body").val("")

        })
    }
})

// Handle Delete Note button
$(document).on("click", ".deleteNote",  function() {
    var noteId = $(this).attr("data-noteID");
    var articleId = $("#modalNote").attr("data-articleID")
    //console.log("click")
    $.ajax({
        method: "DELETE",
        url: "/notes/delete/" + noteId + "/" + articleId
    }).done(function(data) {
        console.log(data)
        $(".modalNote").modal("hide");
        window.location = "/saved"
    })
});