require.config({
    paths: {
        bootstrap: './vendor/bootstrap.min',
        diffMatchPatch: './vendor/diff_match_patch.min',
        handlebars: './vendor/handlebars.min',
        handlebarsExtended: './utils/handlebars_helper',
        jquery: './vendor/jquery.min',
        locales: './locales/locale',
        lodash: './vendor/lodash.custom.min',
        pathToRegexp: './vendor/path-to-regexp/index',
        prettify: './vendor/prettify/prettify',
        semver: './vendor/semver.min',
        utilsSampleRequest: './utils/send_sample_request',
        webfontloader: './vendor/webfontloader',
        list: './vendor/list.min',
    },
    shim: {
        bootstrap: {
            deps: ['jquery'],
        },
        diffMatchPatch: {
            exports: 'diff_match_patch',
        },
        handlebars: {
            exports: 'Handlebars',
        },
        handlebarsExtended: {
            deps: ['jquery', 'handlebars'],
            exports: 'Handlebars',
        },
        prettify: {
            exports: 'prettyPrint',
        },
    },
    urlArgs: `v=${  (new Date()).getTime()}`,
    waitSeconds: 15,
})

require([
    'jquery',
    'lodash',
    'locales',
    'handlebarsExtended',
    './api_project.js',
    './api_data.js',
    'prettify',
    'utilsSampleRequest',
    'semver',
    'webfontloader',
    'bootstrap',
    'pathToRegexp',
    'list',
], function (
    $,
    _,
    locale,
    Handlebars,
    apiProject,
    apiData,
    prettyPrint,
    sampleRequest,
    semver,
    WebFont
) {
    // load google web fonts
    loadGoogleFontCss()

    let {api} = apiData

    //
    // Templates
    //
    let templateHeader = Handlebars.compile( $('#template-header').html() );
    let templateFooter = Handlebars.compile( $('#template-footer').html() );
    let templateArticle = Handlebars.compile( $('#template-article').html() );
    let templateCompareArticle = Handlebars.compile(
        $('#template-compare-article').html()
    )
    let templateGenerator = Handlebars.compile( $('#template-generator').html() );
    let templateProject = Handlebars.compile( $('#template-project').html() );
    let templateSections = Handlebars.compile( $('#template-sections').html() );
    let templateSidenav = Handlebars.compile( $('#template-sidenav').html() );

    //
    // apiProject defaults
    //
    if (!apiProject.template) apiProject.template = {}

    if (apiProject.template.withCompare == null)
        apiProject.template.withCompare = true

    if (apiProject.template.withGenerator == null)
        apiProject.template.withGenerator = true

    if (apiProject.template.forceLanguage)
        locale.setLanguage(apiProject.template.forceLanguage)

    if (apiProject.template.aloneDisplay == null)
        apiProject.template.aloneDisplay = false

    // Setup jQuery Ajax
    $.ajaxSetup(apiProject.template.jQueryAjaxSetup)

    //
    // Data transform
    //
    // grouped by group
    let apiByGroup = _.groupBy(api, function (entry) {
        return entry.group
    })

    // grouped by group and name
    let apiByGroupAndName = {}
    $.each(apiByGroup, function (index, entries) {
        apiByGroupAndName[index] = _.groupBy(entries, function (entry) {
            return entry.name
        })
    })

    //
    // sort api within a group by title ASC and custom order
    //
    let newList = []
    let umlauts = { ä: 'ae', ü: 'ue', ö: 'oe', ß: 'ss' } // TODO: remove in version 1.0
    $.each(apiByGroupAndName, function (index, groupEntries) {
        // get titles from the first entry of group[].name[] (name has versioning)
        let titles = []
        $.each(groupEntries, function (titleName, entries) {
            let {title} = entries[0]
            if (title !== undefined) {
                title.toLowerCase().replace(/[äöüß]/g, function ($0) {
                    return umlauts[$0]
                })
                titles.push(`${title  }#~#${  titleName}`) // '#~#' keep reference to titleName after sorting
            }
        })
        // sort by name ASC
        titles.sort()

        // custom order
        if (apiProject.order)
            titles = sortByOrder(titles, apiProject.order, '#~#')

        // add single elements to the new list
        titles.forEach(function (name) {
            let values = name.split('#~#')
            let key = values[1]
            groupEntries[key].forEach(function (entry) {
                newList.push(entry)
            })
        })
    })
    // api overwrite with ordered list
    api = newList

    //
    // Group- and Versionlists
    //
    let apiGroups = {}
    let apiGroupTitles = {}
    let apiVersions = {}
    apiVersions[apiProject.version] = 1

    $.each(api, function (index, entry) {
        apiGroups[entry.group] = 1
        apiGroupTitles[entry.group] = entry.groupTitle || entry.group
        apiVersions[entry.version] = 1
    })

    // sort groups
    apiGroups = Object.keys(apiGroups)
    apiGroups.sort()

    // custom order
    if (apiProject.order) apiGroups = sortByOrder(apiGroups, apiProject.order)

    // sort versions DESC
    apiVersions = Object.keys(apiVersions)
    apiVersions.sort(semver.compare)
    apiVersions.reverse()

    //
    // create Navigationlist
    //
    let nav = []
    apiGroups.forEach(function (group) {
        // Mainmenu entry
        nav.push({
            group,
            isHeader: true,
            title: apiGroupTitles[group],
        })

        // Submenu
        let oldName = ''
        api.forEach(function (entry) {
            if (entry.group === group) {
                if (oldName !== entry.name) {
                    nav.push({
                        title: entry.title,
                        group,
                        name: entry.name,
                        type: entry.type,
                        version: entry.version,
                        url: entry.url,
                    })
                } else {
                    nav.push({
                        title: entry.title,
                        group,
                        hidden: true,
                        name: entry.name,
                        type: entry.type,
                        version: entry.version,
                        url: entry.url,
                    })
                }
                oldName = entry.name
            }
        })
    })

    /**
     * Add navigation items by analyzing the HTML content and searching for h1 and h2 tags
     * @param nav Object the navigation array
     * @param content string the compiled HTML content
     * @param index where to insert items
     * @return boolean true if any good-looking (i.e. with a group identifier) <h1> tag was found
     */
    function add_nav(nav, content, index) {
        let found_level1 = false
        if (!content) {
            return found_level1;
        }
        let topics = content.match(/<h(1|2).*?>(.+?)<\/h(1|2)>/gi)
        if (topics) {
            topics.forEach(function(entry) {
                let level = entry.substring(2,3);
                let title = entry.replace(/<.+?>/g, ''); // Remove all HTML tags for the title
                let entry_tags = entry.match(/id="api-([^\-]+)(?:-(.+))?"/); // Find the group and name in the id property
                let group = (entry_tags ? entry_tags[1] : null);
                let name = (entry_tags ? entry_tags[2] : null);
                if (level==1 && title && group) {
                      nav.splice(index, 0, {
                          group,
                          isHeader: true,
                          title,
                          isFixed: true,
                    });
                    index++;
                    found_level1 = true;
                  }
                if (level==2 && title && group && name) {
                    nav.splice(index, 0, {
                          group,
                          name,
                          isHeader: false,
                          title,
                          isFixed: false,
                          version: '1.0',
                    });
                    index++;
                  }
              })
        }
        return found_level1
    }

    // Mainmenu Header entry
    if (apiProject.header) {
        var found_level1 = add_nav(nav, apiProject.header.content, 0) // Add level 1 and 2 titles
        if (!found_level1) {
         // If no Level 1 tags were found, make a title
            nav.unshift({
                group: '_',
                isHeader: true,
                title:
                    apiProject.header.title == null
                        ? locale.__('General')
                        : apiProject.header.title,
                isFixed: true,
            })
        }
    }

    // Mainmenu Footer entry
    if (apiProject.footer) {
        let last_nav_index = nav.length
        var found_level1 = add_nav(nav, apiProject.footer.content, nav.length) // Add level 1 and 2 titles
        if (!found_level1 && apiProject.footer.title != null) {
            // If no Level 1 tags were found, make a title
            nav.splice(last_nav_index, 0, {
                group: '_footer',
                isHeader: true,
                title: apiProject.footer.title,
                isFixed: true,
            })
        }
    }

    // render pagetitle
    let title = apiProject.title
        ? apiProject.title
        : 'apiDoc: ' + apiProject.name + ' - ' + apiProject.version
    $(document).attr('title', title)

    // remove loader
    $('#loader').remove()

    // render sidenav
    let fields = {
        nav,
    }
    $('#sidenav').append(templateSidenav(fields))

    // render Generator
    $('#generator').append(templateGenerator(apiProject))

    // render Project
    _.extend(apiProject, { versions: apiVersions })
    $('#project').append(templateProject(apiProject))

    // render apiDoc, header/footer documentation
    if (apiProject.header)
        $('#header').append(templateHeader(apiProject.header))

    if (apiProject.footer)
        $('#footer').append(templateFooter(apiProject.footer))

    //
    // Render Sections and Articles
    //
    let articleVersions = {}
    let content = ''

    // --------------
    // When running locally we want to have a slightly different path due to the load balancer redirecting urls.
    // To append "/api/v1" to the docs location (or "/v1" for localhost builds)
    let docs_location = location.origin;
    let index_to = location.pathname.indexOf("docs/") - 1;
    docs_location += location.pathname.substr(0, index_to);
    // --------------

    apiGroups.forEach(function (groupEntry) {
        let articles = []
        let oldName = ''
        var fields = {}
        let title = groupEntry
        let description = ''
        articleVersions[groupEntry] = {}

        // render all articles of a group
        api.forEach(function (entry) {
            if (groupEntry === entry.group) {
                if (oldName !== entry.name) {
                    // determine versions
                    api.forEach(function (versionEntry) {
                        if (
                            groupEntry === versionEntry.group &&
                            entry.name === versionEntry.name
                        ) {
                            if (
                                !articleVersions[entry.group].hasOwnProperty(
                                    entry.name
                                )
                            ) {
                                articleVersions[entry.group][entry.name] = []
                            }
                            articleVersions[entry.group][entry.name].push(
                                versionEntry.version
                            )
                        }
                    })
                    fields = {
                        article: entry,
                        versions: articleVersions[entry.group][entry.name],
                    }
                } else {
                    fields = {
                        article: entry,
                        hidden: true,
                        versions: articleVersions[entry.group][entry.name],
                    }
                }

                // add prefix URL for endpoint unless it's already absolute
                if (apiProject.url) {
                    if (
                        fields.article.url.substr(0, 4).toLowerCase() !== 'http'
                    ) {
                        fields.article.url = apiProject.url + fields.article.url
                    }
                }
                // -----------------------
                if (apiProject.url)
                {
                    fields.article.url = docs_location + apiProject.url + fields.article.url;
                }
                try
                {
                    fields.article.sampleRequest[0].url =
                        fields.article.sampleRequest[0].url.replace(
                            'DYNAMIC',
                            docs_location
                }
                catch(e)
                {
                }
                // -----------------------

                addArticleSettings(fields, entry)

                if (entry.groupTitle) title = entry.groupTitle

                // TODO: make groupDescription compareable with older versions (not important for the moment)
                if (entry.groupDescription) description = entry.groupDescription

                articles.push({
                    article: templateArticle(fields),
                    group: entry.group,
                    name: entry.name,
                    aloneDisplay: apiProject.template.aloneDisplay,
                })
                oldName = entry.name
            }
        })

        // render Section with Articles
        var fields = {
            group: groupEntry,
            title,
            description,
            articles,
            aloneDisplay: apiProject.template.aloneDisplay,
        }
        content += templateSections(fields)
    })
    $('#sections').append(content)

    // Bootstrap Scrollspy
    $(this).scrollspy({ target: '#scrollingNav', offset: 18 })

    // Content-Scroll on Navigation click.
    $('.sidenav')
        .find('a')
        .on('click', function (e) {
            e.preventDefault()
            var id = $(this).attr('href')
            if ($(id).length > 0)
                $('html,body').animate(
                    { scrollTop: parseInt($(id).offset().top) },
                    400
                )
            window.location.hash = $(this).attr('href')
        })

    // Quickjump on Pageload to hash position.
    if (window.location.hash) {
        var id = window.location.hash
        if ($(id).length > 0)
            $('html,body').animate(
                { scrollTop: parseInt($(id).offset().top) },
                0
            )
    }

    /**
     * Check if Parameter (sub) List has a type Field.
     * Example: @apiSuccess          varname1 No type.
     *          @apiSuccess {String} varname2 With type.
     *
     * @param {Object} fields
     */
    function _hasTypeInFields(fields) {
        let result = false
        $.each(fields, function (name) {
            result =
                result ||
                _.some(fields[name], function (item) {
                    return item.type
                })
        })
        return result
    }

    /**
     * On Template changes, recall plugins.
     */
    function initDynamic() {
        // Bootstrap popover
        $('button[data-toggle="popover"]')
            .popover()
            .click(function (e) {
                e.preventDefault()
            })

        let version = $('#version strong').html()
        $('#sidenav li').removeClass('is-new')
        if (apiProject.template.withCompare) {
            $(`#sidenav li[data-version='${  version  }']`).each(function(){
                let group = $(this).data('group')
                let name = $(this).data('name')
                let {length} = $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\']');
                let index = $(`#sidenav li[data-group='${  group  }'][data-name='${  name  }']`).index($(this));
                if (length === 1 || index === length - 1)
                    $(this).addClass('is-new')
            })
        }

        // tabs
        $('.nav-tabs-examples a').click(function (e) {
            e.preventDefault()
            $(this).tab('show')
        })
        $('.nav-tabs-examples').find('a:first').tab('show')

        // sample header-content-type switch
        $('.sample-header-content-type-switch').change(function () {
            let paramName = `.${  $(this).attr('name')  }-fields`
            let bodyName = `.${  $(this).attr('name')  }-body`
            let selectName = `select[name=${  $(this).attr('name')  }]`
            if ($(this).val() == 'body-json') {
                $(selectName).val('undefined')
                $(this).val('body-json')
                $(paramName).removeClass('hide')
                $(this).parent().nextAll(paramName).first().addClass('hide')
                $(bodyName).addClass('hide')
                $(this).parent().nextAll(bodyName).first().removeClass('hide')
            } else if ($(this).val() == 'body-form-data') {
                $(selectName).val('undefined')
                $(this).val('body-form-data')
                $(bodyName).addClass('hide')
                $(paramName).removeClass('hide')
            } else {
                $(this).parent().nextAll(paramName).first().removeClass('hide')
                $(this).parent().nextAll(bodyName).first().addClass('hide')
            }
            $(this).prev('.sample-request-switch').prop('checked', true)
        })

        // sample request switch
        $('.sample-request-switch').click(function (e) {
            let paramName = `.${  $(this).attr('name')  }-fields`
            let bodyName = `.${  $(this).attr('name')  }-body`
            let select = $(this)
                .next('.' + $(this).attr('name') + '-select')
                .val()
            if ($(this).prop('checked')) {
                if (select == 'body-json') {
                    $(this)
                        .parent()
                        .nextAll(bodyName)
                        .first()
                        .removeClass('hide')
                } else {
                    $(this)
                        .parent()
                        .nextAll(paramName)
                        .first()
                        .removeClass('hide')
                }
            } else if (select == 'body-json'){
                    $(this).parent().nextAll(bodyName).first().addClass('hide');
                }else {
                    $(this).parent().nextAll(paramName).first().addClass('hide');
                }
        })

        if (apiProject.template.aloneDisplay) {
            // show group
            $('.show-group').click(function () {
                let apiGroup = `.${  $(this).attr('data-group')  }-group`
                let apiGroupArticle =
                    '.' + $(this).attr('data-group') + '-article'
                $('.show-api-group').addClass('hide')
                $(apiGroup).removeClass('hide')
                $('.show-api-article').addClass('hide')
                $(apiGroupArticle).removeClass('hide')
            })

            // show api
            $('.show-api').click(function () {
                let apiName = `.${  $(this).attr('data-name')  }-article`
                let apiGroup = `.${  $(this).attr('data-group')  }-group`
                $('.show-api-group').addClass('hide')
                $(apiGroup).removeClass('hide')
                $('.show-api-article').addClass('hide')
                $(apiName).removeClass('hide')
            })
        }

        // call scrollspy refresh method
        $(window).scrollspy('refresh')

        // init modules
        sampleRequest.initDynamic()
    }
    initDynamic()

    if (apiProject.template.aloneDisplay) {
        let hashVal = window.location.hash
        if (hashVal != null && hashVal.length !== 0) {
            $(`.${  hashVal.slice(1)  }-init`).click();
        }
    }

    // Pre- / Code-Format
    prettyPrint()

    //
    // HTML-Template specific jQuery-Functions
    //
    // Change Main Version
    $('#versions li.version a').on('click', function(e) {
        e.preventDefault();

        var selectedVersion = $(this).html();
        $('#version strong').html(selectedVersion);

        // hide all
        $('article').addClass('hide');
        $('#sidenav li:not(.nav-fixed)').addClass('hide');

        // show 1st equal or lower Version of each entry
        $('article[data-version]').each(function(index) {
            var group = $(this).data('group');
            var name = $(this).data('name');
            var version = $(this).data('version');

            if (semver.lte(version, selectedVersion)) {
                if ($('article[data-group=\'' + group + '\'][data-name=\'' + name + '\']:visible').length === 0) {
                    // enable Article
                    $('article[data-group=\'' + group + '\'][data-name=\'' + name + '\'][data-version=\'' + version + '\']').removeClass('hide');
                    // enable Navigation
                    $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\'][data-version=\'' + version + '\']').removeClass('hide');
                    $('#sidenav li.nav-header[data-group=\'' + group + '\']').removeClass('hide');
                }
            }
        });

        // show 1st equal or lower Version of each entry
        $('article[data-version]').each(function(index) {
            var group = $(this).data('group');
            $('section#api-' + group).removeClass('hide');
            if ($('section#api-' + group + ' article:visible').length === 0) {
                $('section#api-' + group).addClass('hide');
            } else {
                $('section#api-' + group).removeClass('hide');
            }
        });

        initDynamic();
        
    })

    // compare all article with their predecessor
    $('#compareAllWithPredecessor').on('click', changeAllVersionCompareTo)

    // change version of an article
    $('article .versions li.version a').on('click', changeVersionCompareTo)

    // compare url-parameter
    $.urlParam = function (name) {
        let results = new RegExp(`[\\?&amp;]${  name  }=([^&amp;#]*)`).exec(
            window.location.href
        )
        return results && results[1] ? results[1] : null
    }

    if ($.urlParam('compare')) {
        // URL Paramter ?compare=1 is set
        $('#compareAllWithPredecessor').trigger('click')

        if (window.location.hash) {
            var id = window.location.hash
            $('html,body').animate(
                { scrollTop: parseInt($(id).offset().top) - 18 },
                0
            )
        }
    }

    /**
     * Initialize search
     */
    let options = {
          valueNames: ['nav-list-item', 'nav-list-url-item'],
    }
    let endpointsList = new List('scrollingNav', options)

    /**
     * Set initial focus to search input
     */
    $('#scrollingNav .sidenav-search input.search').focus()

    /**
     * Detect ESC key to reset search
     */
    $(document).keyup(function (e) {
        if (e.keyCode === 27) $('span.search-reset').click();
    })

    /**
     * Search reset
     */
    $('span.search-reset').on('click', function () {
        $('#scrollingNav .sidenav-search input.search')
            .val("")
            .focus()
          endpointsList.search()
    })

    /**
     * Change version of an article to compare it to an other version.
     */
    function changeVersionCompareTo(e) {
        e.preventDefault()

        let $root = $(this).parents('article')
        let selectedVersion = $(this).html()
        let $button = $root.find('.version')
        let currentVersion = $button.find('strong').html()
        $button.find('strong').html(selectedVersion)

        let group = $root.data('group')
        let name = $root.data('name')
        let version = $root.data('version')

        let compareVersion = $root.data('compare-version')

        if (compareVersion === selectedVersion) return

        if (!compareVersion && version == selectedVersion) return

        if (
            (compareVersion &&
                articleVersions[group][name][0] === selectedVersion) ||
            version === selectedVersion
        ) {
            // the version of the entry is set to the highest version (reset)
            resetArticle(group, name, version)
        } else {
            let $compareToArticle = $(`article[data-group='${  group  }'][data-name='${  name  }'][data-version='${  selectedVersion  }']`);

            let sourceEntry = {}
            let compareEntry = {}
            $.each(apiByGroupAndName[group][name], function (index, entry) {
                if (entry.version === version) sourceEntry = entry
                if (entry.version === selectedVersion) compareEntry = entry
            })

            let fields = {
                article: sourceEntry,
                compare: compareEntry,
                versions: articleVersions[group][name],
            }

            // add unique id
            // TODO: replace all group-name-version in template with id.
            fields.article.id =
                fields.article.group +
                '-' +
                fields.article.name +
                '-' +
                fields.article.version
            fields.article.id = fields.article.id.replace(/\./g, '_')

            fields.compare.id =
                fields.compare.group +
                '-' +
                fields.compare.name +
                '-' +
                fields.compare.version
            fields.compare.id = fields.compare.id.replace(/\./g, '_')

            var entry = sourceEntry
            if (entry.parameter && entry.parameter.fields)
                fields._hasTypeInParameterFields = _hasTypeInFields(
                    entry.parameter.fields
                )

            if (entry.error && entry.error.fields)
                fields._hasTypeInErrorFields = _hasTypeInFields(
                    entry.error.fields
                )

            if (entry.success && entry.success.fields)
                fields._hasTypeInSuccessFields = _hasTypeInFields(
                    entry.success.fields
                )

            if (entry.info && entry.info.fields)
                fields._hasTypeInInfoFields = _hasTypeInFields(
                    entry.info.fields
                )

            var entry = compareEntry
            if (
                fields._hasTypeInParameterFields !== true &&
                entry.parameter &&
                entry.parameter.fields
            )
                fields._hasTypeInParameterFields = _hasTypeInFields(
                    entry.parameter.fields
                )

            if (
                fields._hasTypeInErrorFields !== true &&
                entry.error &&
                entry.error.fields
            )
                fields._hasTypeInErrorFields = _hasTypeInFields(
                    entry.error.fields
                )

            if (
                fields._hasTypeInSuccessFields !== true &&
                entry.success &&
                entry.success.fields
            )
                fields._hasTypeInSuccessFields = _hasTypeInFields(
                    entry.success.fields
                )

            if (
                fields._hasTypeInInfoFields !== true &&
                entry.info &&
                entry.info.fields
            )
                fields._hasTypeInInfoFields = _hasTypeInFields(
                    entry.info.fields
                )

            let content = templateCompareArticle(fields)
            $root.after(content)
            let $content = $root.next()

            // Event on.click re-assign
            $content
                .find('.versions li.version a')
                .on('click', changeVersionCompareTo)

            // select navigation
            $(`#sidenav li[data-group='${  group  }'][data-name='${  name  }'][data-version='${  currentVersion  }']`).addClass('has-modifications');

            $root.remove()
            // TODO: on change main version or select the highest version re-render
        }

        initDynamic()
    }

    /**
     * Compare all currently selected Versions with their predecessor.
     */
    function changeAllVersionCompareTo(e) {
        e.preventDefault()
        $('article:visible .versions').each(function () {
            let $root = $(this).parents('article')
            let currentVersion = $root.data('version')
            let $foundElement = null
            $(this)
                .find('li.version a')
                .each(function () {
                    var selectVersion = $(this).html()
                    if (selectVersion < currentVersion && !$foundElement)
                        $foundElement = $(this)
                })

            if ($foundElement) $foundElement.trigger('click')
        })
        initDynamic()
    }

    /**
     * Sort the fields.
     */
    function sortFields(fields_object) {
        $.each(fields_object, function (key, fields) {
            let reversed = fields.slice().reverse()

            let max_dot_count = Math.max.apply(
                null,
                reversed.map(function (item) {
                    return item.field.split('.').length - 1
                })
            )

            for (var dot_count = 1; dot_count <= max_dot_count; dot_count++) {
                reversed.forEach(function (item, index) {
                    let parts = item.field.split('.')
                    if (parts.length - 1 == dot_count) {
                        let fields_names = fields.map(function (item) {
                            return item.field
                        })
                        if (parts.slice(1).length >= 1) {
                            let prefix = parts
                                .slice(0, parts.length - 1)
                                .join('.')
                            let prefix_index = fields_names.indexOf(prefix)
                            if (prefix_index > -1) {
                                fields.splice(
                                    fields_names.indexOf(item.field),
                                    1
                                )
                                fields.splice(prefix_index + 1, 0, item)
                            }
                        }
                    }
                })
            }
        })
    }

    /**
     * Add article settings.
     */
    function addArticleSettings(fields, entry) {
        // add unique id
        // TODO: replace all group-name-version in template with id.
        fields.id =
            fields.article.group +
            '-' +
            fields.article.name +
            '-' +
            fields.article.version
        fields.id = fields.id.replace(/\./g, '_')

        if (entry.header && entry.header.fields) {
            sortFields(entry.header.fields)
            fields._hasTypeInHeaderFields = _hasTypeInFields(
                entry.header.fields
            )
        }

        if (entry.parameter && entry.parameter.fields) {
            sortFields(entry.parameter.fields)
            fields._hasTypeInParameterFields = _hasTypeInFields(
                entry.parameter.fields
            )
        }

        if (entry.error && entry.error.fields) {
            sortFields(entry.error.fields)
            fields._hasTypeInErrorFields = _hasTypeInFields(entry.error.fields)
        }

        if (entry.success && entry.success.fields) {
            sortFields(entry.success.fields)
            fields._hasTypeInSuccessFields = _hasTypeInFields(
                entry.success.fields
            )
        }

        if (entry.info && entry.info.fields) {
            sortFields(entry.info.fields)
            fields._hasTypeInInfoFields = _hasTypeInFields(entry.info.fields)
        }

        // add template settings
        fields.template = apiProject.template
    }

    /**
     * Render Article.
     */
    function renderArticle(group, name, version) {
        let entry = {}
        $.each(apiByGroupAndName[group][name], function (index, currentEntry) {
            if (currentEntry.version === version) entry = currentEntry
        })
        let fields = {
            article: entry,
            versions: articleVersions[group][name],
        }

        addArticleSettings(fields, entry)

        return templateArticle(fields)
    }

    /**
     * Render original Article and remove the current visible Article.
     */
    function resetArticle(group, name, version) {
        var $root = $('article[data-group=\'' + group + '\'][data-name=\'' + name + '\']:visible');
        var content = renderArticle(group, name, version);

        $root.after(content);
        var $content = $root.next();

        // Event on.click needs to be reassigned (should actually work with on ... automatically)
        $content.find('.versions li.version a').on('click', changeVersionCompareTo);

        $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\'][data-version=\'' + version + '\']').removeClass('has-modifications');

        $root.remove();
        
    }

    /**
     * Load google fonts.
     */
    function loadGoogleFontCss() {
        WebFont.load({
            active() {
                // Update scrollspy
                $(window).scrollspy('refresh')
            },
            google: {
                families: ['Source Code Pro', 'Source Sans Pro:n4,n6,n7'],
            },
        })
    }

    /**
     * Return ordered entries by custom order and append not defined entries to the end.
     * @param  {String[]} elements
     * @param  {String[]} order
     * @param  {String}   splitBy
     * @return {String[]} Custom ordered list.
     */
    function sortByOrder(elements, order, splitBy) {
        let results = []
        order.forEach(function (name) {
            if (splitBy)
                elements.forEach(function (element) {
                    let parts = element.split(splitBy)
                    let key = parts[0] // reference keep for sorting
                    if (key == name || parts[1] == name) results.push(element)
                })
            else
                elements.forEach(function (key) {
                    if (key == name) results.push(name)
                })
        })
        // Append all other entries that ar not defined in order
        elements.forEach(function (element) {
            if (results.indexOf(element) === -1) results.push(element)
        })
        return results
    }
})

let burger_side_showing = true
function on_click_burger(item) {
    burger_side_showing = !burger_side_showing;

    // Change the icon
    item.classList.toggle("change");

    if( burger_side_showing )
    {
        // This is the side nav bar is showing.
        // $('.sidenav').each( function(){ $(this).css("margin-left:-320px" ) } );	
        $(".sidenav-search").each( function(){ $(this).removeClass("navbar_hide"); } );	
        $(".sidenav").each( function(){ $(this).removeClass("navbar_hide"); } );	
        $(".container-fluid .row #content").css("margin-left","270px");
        $(".container-fluid .row #content").css("width","calc(100% - 270px)");
    }
    else
    {
        // The sidebar is not showing.
        $(".sidenav-search").each( function(){ $(this).addClass("navbar_hide"); } );	
        $(".sidenav").each( function(){ $(this).addClass("navbar_hide"); } );	
        $(".container-fluid .row #content").css("margin-left","0px");		
        $(".container-fluid .row #content").css("width","calc(100% - 270px)");
    }
}

let show_internal = true
function on_show_internal(item) {
    show_internal = !show_internal;

    // Change the icon
    item.classList.toggle("change");

    if( show_internal )
    {
        // This is the side nav bar is showing.
        // $('.sidenav').each( function(){ $(this).css("margin-left:-320px" ) } );	
        $(".internal").css("display","none");
    }
    else
    {
        // The sidebar is not showing.
        $(".internal").css("display","initial");
    }
}