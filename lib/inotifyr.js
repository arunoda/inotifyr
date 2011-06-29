var fs = require('fs');
var Inotify = require('inotify').Inotify;

//expose to others
exports.Inotify = Inotifyr;

for(var constant in Inotify) {
	exports.Inotify[constant] = Inotify[constant];
}

function Inotifyr(flag) {
	
	var linkStore = {};
	var allLinks = {};
	var parent = new Inotify(flag);

	this.addWatch = function(watch) {
		
		var rootWatch = cloneWatch(watch);
		rootWatch['callback'] = newCallback(watch, "");
		//add the base watcher
		console.info('adding main watcher to path: %s', rootWatch.path);
		var link = parent.addWatch(rootWatch);

		//add watches to other folders as well (only 1 depth)
		recursiveWatcher(watch);

		return link;
	};

	this.removeWatch = function(link) {
		parent.removeWatch(link);
	}

	function newCallback(oldWatcher, dir) {
		
		return function (event) {
			event.dir = oldWatcher.path + '/' + dir;;
			oldWatcher.callback(event);
		}
	}

	function recursiveWatcher(watch) {
		
		linkStore[watch.path] = [];
		fs.readdir(watch.path, function(err, files) {
			
			if(!err) {
				files.forEach(function(file) {
					var childWatch = cloneWatch(watch);
					if(!err) {
						childWatch.path = watch.path + '/' + file;
						childWatch['callback'] = newCallback(watch, file)
						console.info('adding recursive watcher to path: %s', childWatch.path);
						var link = parent.addWatch(childWatch);
						linkStore[watch.path].push(link);
						allLinks[childWatch.path] = link;
					} else {
						console.error("Error occured when getting child folders of %s - err: %s", childWatch.path, JSON.stringify(err));
					}
				});
			} else {
				console.error('error with accessing the folder: %s', childWatch.path);
			}
		});
	}
}

function cloneWatch(old) {
	var newOne = {
		path: old.path,
		watch_for: old.watch_for,
		callback: old.callback,
		cookie: old.cookie
	}
	return newOne;
}