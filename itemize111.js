var fs = require('fs');
var tmp = require('tmp');

exports.hook_data = function (next, connection) {
    // enable mail body parsing
    connection.transaction.parse_body = 1;
    connection.transaction.attachment_hooks(
        function (ct, fn, body, stream) {
            start_att(connection, ct, fn, body, stream)
        }
    );
    next();
}

function start_att (connection, ct, fn, body, stream) {
    connection.loginfo("<<<<<<<<<<<<<<<<<<<<<Getting attachment");
    connection.loginfo("Got attachment: " + ct + ", " + fn + " for user id: " + "user");
//connection.transaction.notes.hubdoc_user.email);
    connection.transaction.notes.attachment_count++;
    connection.transaction.notes.attachment_files = [];


    stream.connection = connection; // Allow backpressure
    stream.pause();

    tmp.file(function (err, path, fd) {
        connection.loginfo("Got tempfile: " + path + " (" + fd + ")");
        var ws = fs.createWriteStream(path);
        stream.pipe(ws);
        stream.resume();
        connection.transaction.notes.attachment_files.push(path);
        connection.loginfo("after create write stream");
//        ws.on('close', function ( ) {
        ws.on('end', function ( ) {
	    connection.pause();
            connection.loginfo("End of stream reached");
            fs.fstat(fd, function (err, stats) {
                connection.loginfo("Got data of length: " + stats.size);
            });
        });
    });
}



exports.hook_queue = function (next, connection) {
    var txn = connection.transaction;
    if (!txn) return next();

    txn.message_stream.get_data(function (msg) {
	
       connection.loginfo('get data');
       function extractChildren(children) {
	  
          return children.map(function (child) {
            var data = {
                bodytext: child.bodytext,
                headers: child.header.headers_decoded,
                bodyencoding: child.body_encoding,
                is_html: child.is_html,
                state: child.state
            }
            if (child.children.length > 0) data.children = extractChildren(child.children);
            return data;
          })
       }
           
   
//	connection.loginfo("<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>");
//	connection.loginfo(txn.notes.attachment_files);
//	connection.loginfo("<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>");
 
      var body_child_array = extractChildren(connection.transaction.body.children);
 //     connection.loginfo(body_child_array.length);
      for (var i = 0; i < body_child_array.length; i++) {
        var body_child_each = body_child_array[i];
//	connection.loginfo(body_child_each);
        if(body_child_each.state != "body" ){
		connection.loginfo( body_child_each.headers['content-disposition'] );
		connection.loginfo( body_child_each.headers['content-description'] );
		connection.loginfo( body_child_each.headers['content-type'] );
			
	}
	else {
		connection.loginfo( body_child_each.headers['content-type'] );
		connection.loginfo( body_child_each.bodytext );
		
	}
    }
        
    return next(OK, 'Queued OK');

   })

}
