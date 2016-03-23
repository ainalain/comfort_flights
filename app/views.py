from flask import render_template
from app import app
from flask import request, jsonify
from flask import send_from_directory
import sys, os
import psycopg2
import json
import unicodedata
import api_keys

@app.route('/')
@app.route('/index')

#return index template
def index():
    apikey = api_keys.APPLICATION_API_KEY
    return render_template('index.html', apikey=apikey)

#search for airports around user location, they'll be origins
@app.route('/user_info')
def user_info():
    print 'Trying to get user airports!'
    query = request.args.get('parameters')
    print 'User coordinates: ', query
    bounds = query.split(',')
    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()
    #convert string representation of bounds to float type
    bounds = [float(n) for n in bounds]

    #perform type casting in psycopg2: convert DECIMAL objects of lat&long into normal float representation
    cur.execute("SELECT NULL::DECIMAL")
    point_oid = cur.description[0][1]
    DEC2FLOAT = psycopg2.extensions.new_type((point_oid,), 'DEC2FLOAT',
                lambda value, curs: float(value) if value is not None else None)
    psycopg2.extensions.register_type(DEC2FLOAT)
    if (bounds[2] <= bounds[3]):
        sql = "SELECT * FROM airports WHERE %s <= latitude::DECIMAL AND latitude::DECIMAL <= %s AND (%s<= longitude::DECIMAL AND longitude::DECIMAL <= %s);"
    else:
        sql = "SELECT * FROM airports WHERE %s <= latitude::DECIMAL AND latitude::DECIMAL <= %s AND (%s<= longitude::DECIMAL OR longitude::DECIMAL <= %s);"
    data = (bounds[0], bounds[1], bounds[2], bounds[3])
    cur.execute(sql, data)
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()
    #make a list of dictionaries from all rows of table
    d = []
    for every_tuple in x:
        keys = ['id', 'name', 'city', 'country', 'iata_faa', 'icao', 'latitude', 'longitude', 'timezone', 'index_textsearch']
        new_d = dict(zip(keys, every_tuple))
        d.append(new_d)
    print 'User airports: '
    #print d

    return jsonify(results=d)
#identify user's country and show it's capital for the first load of the map
@app.route('/first_load')
def first_load():
    #get user's country
    country = request.args.get('parameters')
    if len(country) < 2:
        print 'Can\'t understand user\'s country!'
    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()

    #get capital of this country
    sql = "SELECT * FROM airports WHERE country=%s"
    data = (country,)
    cur.execute(sql, data)
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    print 'First load: ', x
    #make a list of dictionaries from all rows of table
    d = []
    for every_tuple in x:
        keys = ['id', 'name', 'city', 'country', 'iata_faa', 'icao', 'latitude', 'longitude', 'timezone', 'index_textsearch']
        new_d = dict(zip(keys, every_tuple))
        d.append(new_d)
    #print 'Last result: '
    #print d

    return jsonify(results=d)

@app.route('/search')
def search():
    query = request.args.get('query_string')
    query = query.lower()
    query = query.split(' ')
    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")

    #open a cursor to perform operations
    cur = conn.cursor()

    if (len(query) < 2):
        #make request for prefix match
        query = query[0] + ':*'
        print query
        sql = "SELECT * FROM airports WHERE textsearchable_index_col @@ to_tsquery(%s)"
        data = (query, )
        cur.execute(sql, data)
        print 'Done with one word!'
    else:
        #make a parsed string for tsquery()
        string = ':* & '.join(query)
        print string
        #make request for prefix match
        string = string + ':*'
        sql = "SELECT * FROM airports WHERE textsearchable_index_col @@ to_tsquery(%s)"
        data = (string, )
        cur.execute(sql, data)
        print 'Done with all words!'

    #result is a list of tuples, every tuple has 10 items
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    #make a list of dictionaries from all rows of table
    d = []
    for every_tuple in x:
        keys = ['id', 'name', 'city', 'country', 'iata_faa', 'icao', 'latitude', 'longitude', 'timezone', 'index_textsearch']
        new_d = dict(zip(keys, every_tuple))
        d.append(new_d)
    print 'Last result: '
    print d
    return jsonify(results=d)

#update map with regard to new bounds
@app.route('/update')
def update():
    #get new bounds
    parameters = request.args.get('parameters')
    parameters = parameters.split(',')
    print parameters
    bounds = parameters[0:4]
    print bounds
    country = parameters[4:]

    if (len(bounds) < 4):
        sys.exit(400)
    if (len(country) < 1):
        sys.exit(400)
    #define a function which would remove all diacritics from country like Cote d'Ivoire
    #it's necessary because our database of airports has not diacritics
    def remove_accents(input_str):
        nkfd_form = unicodedata.normalize('NFKD', input_str)
        return u"".join([c for c in nkfd_form if not unicodedata.combining(c)])

    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()
    #convert string representation of bounds to float type
    bounds = [float(n) for n in bounds]

    #perform type casting in psycopg2: convert DECIMAL objects of lat&long into normal float representation
    cur.execute("SELECT NULL::DECIMAL")
    point_oid = cur.description[0][1]
    DEC2FLOAT = psycopg2.extensions.new_type((point_oid,), 'DEC2FLOAT',
                lambda value, curs: float(value) if value is not None else None)
    psycopg2.extensions.register_type(DEC2FLOAT)

     #check for ocean case in request
    if ('ocean_yes' in country):
        country = country[0:2]
        x = float(country[0])
        y = float(country[1])
       # postgis_point = ST_SetSRID(ST_Point(y, x), 4326)
        sql = "SELECT adm0_left, adm0_right FROM ne_10m_admin_0_boundary_lines_land ORDER BY wkb_geometry <#> ST_SetSRID(ST_Point(%s, %s), 4326) LIMIT 3;"
        data = (y, x)
        cur.execute(sql, data)
        print "Found nearest country!"
        nearest = cur.fetchall()
        print nearest
        #if first country in this list cannot been found in airports table
        #(like Ivory Cost instead of Cote d'Ivoire) then let's choose the second country
        country_tuple = nearest[0]
        country = list(country_tuple)[0]
        country1 = list(country_tuple)[1]
        sql = "SELECT * FROM airports WHERE country=%s"
        data = (country,)
        cur.execute(sql, data)
        countries = cur.fetchall()
        if (countries != []):
            country = country
        else:
            country = country1
            print "Choose second country"

    else:
        country = remove_accents(country[0])

    #select country where center of bounds is set
    #if bounds don't cross the antimeridian
    if (bounds[3] <= bounds[1]):
        print 'regular case'
        sql = "SELECT * FROM airports WHERE country=%s AND (%s <= latitude::DECIMAL AND latitude::DECIMAL <= %s AND (%s<= longitude::DECIMAL AND longitude::DECIMAL <= %s));"
    #if bounds cross the antimeridian
    else:
        print 'east border at west hemisphere, west border at east hemisphere'
        sql = "SELECT * FROM airports WHERE country=%s AND (%s <= latitude::DECIMAL AND latitude::DECIMAL <= %s AND (%s<= longitude::DECIMAL OR longitude::DECIMAL <= %s));"
    if type((country) == 'string'):
        land_country = country.encode('utf-8')
        print sys.stdout.encoding
        print land_country
        data = (land_country, bounds[2], bounds[0], bounds[3], bounds[1])
        cur.execute(sql, data)
    else:
        for land_country in country:
            print land_country
            data = (land_country, bounds[2], bounds[0], bounds[3], bounds[1])
            cur.execute(sql, data)
    print 'Done with bounds!'
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    #make a list of dictionaries from all rows of table
    d = []
    for every_tuple in x:
        keys = ['id', 'name', 'city', 'country', 'iata_faa', 'icao', 'latitude', 'longitude', 'timezone', 'index_textsearch']
        new_d = dict(zip(keys, every_tuple))
        d.append(new_d)
    #print 'Last result: '
    #print d

    return jsonify(results=d)

#find the coordinates of the new submitted origin city
@app.route('/new_origin')
def new_origin():
    iata_code = request.args.get('parameters')
    print 'Parameters for new_orgiin: ', iata_code
    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()
    #select geographic coordinates of this city
    sql = "SELECT latitude, longitude, city, country, iata_faa FROM airports WHERE iata_faa=%s;"
    data = (iata_code,)

    cur.execute(sql, data)
    x = cur.fetchall()
    print x

    #save the changes
    conn.commit()
    #close connection with database
    cur.close()
    conn.close()

    return jsonify(results=x)



#get the capital of country in focus for showing only 1 marker
@app.route('/capital')
def capital():
    country = request.args.get('parameters')
    print country

    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()

    #get capital of this country
    sql = "SELECT capital FROM capitals WHERE country_common=%s OR country_official LIKE %s;"
    data = (country, country)
    cur.execute(sql, data)
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    print 'Capital: ', x
    return jsonify(results=x)

#find the iata code of (clicked on the map) city for the google request
@app.route('/get_airport_code')
def get_airport_code():
    #hold the city where airports are in search
    parameters = request.args.get('parameters')
    parameters = parameters.split(',')
    print 'Parameters for iataa_faa: ', parameters
    city = parameters[0]
    country = parameters[1]
    latitude = float(parameters[2])
    print 'Parameters for flights: ', city, ' ', country, ' ', latitude

    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()
    #select all codes (iata_faa + icao) of all airports of this city
    sql = "SELECT iata_faa, icao FROM airports WHERE (country=%s AND city=%s) OR latitude=%s;"
    data = (country, city, latitude)

    cur.execute(sql, data)
    x = cur.fetchall()
    #print x

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    return jsonify(results=x)

#check if this country is small or large for the correct zoom of clusterization
@app.route('/large_country')
def large_country():
    wanted_country = request.args.get('parameters')
    #parameters = parameters.split(',')
    print 'Country: ', type(wanted_country), ' ', wanted_country

    #connect to the postgres database
    conn = psycopg2.connect("dbname=airports user=jharvard")
    #open a cursor to perform operations
    cur = conn.cursor()
    #try to find this country in table of largest 50 countries
    sql = "SELECT * FROM largest_countries WHERE country=%s;"
    data = (wanted_country, )
    cur.execute(sql, data)
    x = cur.fetchall()

    #save the changes
    conn.commit()

    #close connection with database
    cur.close()
    conn.close()

    return jsonify(results=x)
